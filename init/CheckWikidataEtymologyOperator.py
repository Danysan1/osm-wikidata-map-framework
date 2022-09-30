from airflow.providers.postgres.operators.postgres import PostgresOperator

class CheckWikidataEtymologyOperator(PostgresOperator):
    def __init__(self, **kwargs) -> None:
        super().__init__(
            sql = "sql/check-wd-etymology.sql",
            **kwargs,
            doc_md = """
                # Check elements with a Wikidata etymology

                Check elements with an etymology that comes from `subject:wikidata`, `name:etymology:wikidata` or `wikidata`+`...`.
                
                Links:
                * [PostgresOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-postgres/2.4.0/_api/airflow/providers/postgres/operators/postgres/index.html#airflow.providers.postgres.operators.postgres.PostgresOperator)
            """
        )
