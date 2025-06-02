Se crea un flujo de trabajo donde primero se filtra con `fitlering.pig`, luego se procesa con `processing.pig` y finalmente se almacena en HDFS.
[]: # 
[]: # ```bash
[]: # pig -x mapreduce filtering.pig
[]: # pig -x mapreduce processing.pig
[]: # hadoop fs -put output_directory /user/hadoop/output
[]: # ```
[]: # 
[]: # Asegúrate de que `output_directory` sea el directorio donde se guardan los resultados de Pig.

se genera todo con `./pig/scripts/run_filtering_json.sh` siempre que esteoms ubicados en la raiz del proyecto

recordar hacer ejecutables los scripts de bash:
```bash
chmod +x ./pig/scripts/run_filtering_json.sh
chmod +x ./pig/scripts/generate_csv_from_db.sh
```

