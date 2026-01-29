from os.path import abspath, dirname, join
from textwrap import dedent

from airflow.datasets import Dataset
from airflow.exceptions import AirflowNotFoundException
from airflow.models.variable import Variable
from airflow.providers.amazon.aws.hooks.s3 import S3Hook
from airflow.providers.amazon.aws.transfers.local_to_s3 import \
    LocalFilesystemToS3Operator
from airflow.providers.standard.operators.python import ShortCircuitOperator
from airflow.sdk import dag
from pendulum import datetime


def get_absolute_path(filename: str, folder: str | None = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)


def check_s3_conn_id(conn_id: str, base_s3_uri_var_id: str) -> bool:
    """
        # Check S3 connection ID

        Check whether the connection ID to an S3 bucket is available: if it is, proceed, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.providers.standard.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """

    if not conn_id:
        print(f"AWS connection ('{conn_id}') not available, skipping upload")
        return False

    if not Variable.get(base_s3_uri_var_id, None):
        print(
            f"S3 base URI variable ('{base_s3_uri_var_id}') not available, skipping upload")
        return False

    base_s3_uri = Variable.get(base_s3_uri_var_id)
    try:
        s3_hook = S3Hook(conn_id)
        # See https://airflow.apache.org/docs/apache-airflow/1.10.10/_api/airflow/hooks/S3_hook/index.html
        if s3_hook.check_for_key(f"{base_s3_uri}/"):
            print(
                f"Base S3 URI '{base_s3_uri}/' exists and is reachable with connection ID '{conn_id}', uploading")
            return True
        else:
            print(
                f"Base S3 URI '{base_s3_uri}/' does not exist or is not reachable with connection ID '{conn_id}', skipping upload")
            return False
    except AirflowNotFoundException as e:
        print(
            f"Base S3 URI '{base_s3_uri}/' does not exist or is not reachable with connection ID '{conn_id}', skipping upload. Detailed error:")
        print(e)
        return False
    except Exception as e:
        print(
            f"Failed connecting to S3 (connection ID '{conn_id}', base S3 URI '{base_s3_uri}/'), skipping upload. Detailed error:")
        print(e)
        return False


def OwmfUploadToAwsDAG(
    prefix: str,
    **kwargs
):
    """
    Apache Airflow DAG to upload the tiles and dataset to AWS S3
    Triggered on the availability of the tiles

    Keyword arguments:
    ----------
    prefix: str
        prefix to search in the PBF filename
    """

    # https://airflow.apache.org/docs/apache-airflow/2.6.0/timezone.html
    # https://pendulum.eustace.io/docs/#instantiation
    start_date = datetime(year=2022, month=9, day=15, tz='local')

    tiles_dir = join("/workdir", prefix, "tiles")
    pmtiles_path = join(tiles_dir, "tiles.pmtiles")
    date_path = join(tiles_dir, "date.txt")
    dataset_path = join(tiles_dir, "dataset.csv")

    # URI of the input Airflow dataset for the DAG
    tiles_dataset = Dataset(f'file://{tiles_dir}')

    # Airflow connection ID with the AWS credentials used for uploading the vector tiles and CSV to S3
    upload_s3_conn_id = "aws_s3"

    # Airflow variable ID with the base S3 URI on which the vector tiles and CSV will be uploaded.
    # For example, for a pipeline with prefix 'planet' the base S3 URI must be configured in the Airflow variable 'planet_base_s3_uri'.
    upload_s3_bucket_var_id = f"{prefix}_base_s3_uri"

    # Base S3 URI on which the vector tiles and CSV will be uploaded
    base_s3_uri = f"{{{{ var.value.{upload_s3_bucket_var_id} }}}}"

    @dag(
        start_date=start_date,
        catchup=False,
        schedule=[tiles_dataset],
        tags=['owmf', prefix, 'owmf-upload-to-aws', 'consumes'],
        **kwargs
    )
    def owmf_upload_to_aws():
        """
        # OSM-Wikidata Map Framework DB initialization

        * ingests filtered OSM PBF data
        * downloads relevant Wikidata data
        * combines OSM and Wikidata data
        * uploads the output to the production DB.

        Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
        """

        task_check_pmtiles_upload_conn_id = ShortCircuitOperator(
            task_id="check_pmtiles_upload_conn_id",
            python_callable=check_s3_conn_id,
            op_kwargs={
                "conn_id": upload_s3_conn_id,
                "base_s3_uri_var_id": upload_s3_bucket_var_id,
            },
            doc_md=dedent(check_s3_conn_id.__doc__ or "")
        )
        task_check_pmtiles_upload_conn_id

        pmtiles_base_name = "{{ 'owmf' if (var.value.source_presets is none or var.value.source_presets.startswith('[')) else var.value.source_presets }}"
        task_upload_pmtiles_s3 = LocalFilesystemToS3Operator(
            task_id="upload_pmtiles_to_s3",
            filename=pmtiles_path,
            dest_key=f"{base_s3_uri}/{pmtiles_base_name}.pmtiles",
            replace=True,
            aws_conn_id=upload_s3_conn_id,
            doc_md="""
# Upload the PMTiles file to AWS S3

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        task_check_pmtiles_upload_conn_id >> task_upload_pmtiles_s3

        task_dataset_s3 = LocalFilesystemToS3Operator(
            task_id="upload_dataset_to_s3",
            filename=dataset_path,
            dest_key=f'{base_s3_uri}/dataset.csv',
            replace=True,
            aws_conn_id=upload_s3_conn_id,
            doc_md="""
# Upload dataset to S3

Upload the dataset CSV file to AWS S3.

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        task_upload_pmtiles_s3 >> task_dataset_s3

        task_upload_date_s3 = LocalFilesystemToS3Operator(
            task_id="upload_date_pmtiles_to_s3",
            filename=date_path,
            dest_key=f'{base_s3_uri}/date.txt',
            replace=True,
            aws_conn_id=upload_s3_conn_id,
            doc_md="""
# Upload PMTiles date to S3

Upload the date file for PMTiles to AWS S3.

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        task_upload_pmtiles_s3 >> task_upload_date_s3

    owmf_upload_to_aws()
