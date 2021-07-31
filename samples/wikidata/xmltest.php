<?php

echo json_encode(simplexml_load_string(file_get_contents("./55-output.xml")))
    .PHP_EOL
    .PHP_EOL
    .json_encode((array)simplexml_load_string(file_get_contents("./55-output.xml")));
