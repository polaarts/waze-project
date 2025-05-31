## Cómo usar Apache Pig con Hadoop

### 1. Tener instalado y configurado Hadoop

* Debes tener un clúster Hadoop (puede ser local en modo pseudo-distribuido o un clúster real).
* Asegúrate que Hadoop está corriendo y que puedes usar comandos como:

```bash
hdfs dfs -ls /
```

Si no tienes Hadoop instalado, avísame para ayudarte con eso.

---

### 2. Instalar Apache Pig (si no lo has hecho)

Descarga y descomprime Pig:

```bash
cd /opt
sudo wget https://downloads.apache.org/pig/pig-0.17.0/pig-0.17.0.tar.gz
sudo tar -xzvf pig-0.17.0.tar.gz
sudo mv pig-0.17.0 pig
sudo rm pig-0.17.0.tar.gz
```

Configura las variables de entorno en `~/.bashrc`:

```bash
export PIG_HOME=/opt/pig
export PATH=$PATH:$PIG_HOME/bin
```

Luego recarga:

```bash
source ~/.bashrc
```

---

### 3. Configurar Pig para Hadoop

* Pig detecta automáticamente tu configuración Hadoop si las variables de entorno están configuradas correctamente.
* Verifica que tienes configurado `HADOOP_HOME` y que el comando `hadoop` funciona.

Por ejemplo, añade en `~/.bashrc`:

```bash
export HADOOP_HOME=/opt/hadoop
export PATH=$PATH:$HADOOP_HOME/bin
```

Recarga:

```bash
source ~/.bashrc
```

---

### 4. Ejecutar Pig en modo MapReduce (con Hadoop)

Para correr Pig usando Hadoop y que los scripts se ejecuten como trabajos MapReduce, usa:

```bash
pig -x mapreduce
```

Esto abrirá el shell de Pig (`grunt>`), pero las operaciones se ejecutan en el clúster Hadoop.

---

### 5. Ejecutar un script Pig con Hadoop

Puedes ejecutar un script `.pig` directamente así:

```bash
pig -x mapreduce tu_script.pig
```

---

### 6. Usar HDFS para almacenar datos

Antes de ejecutar scripts, sube los datos a HDFS:

```bash
hdfs dfs -mkdir /usuario/datos
hdfs dfs -put datos.txt /usuario/datos/
```

En tu script Pig, cargas datos de HDFS:

```pig
A = LOAD '/usuario/datos/datos.txt' AS (campo1:chararray, campo2:int);
```

---

### 7. Ver resultados

Puedes usar `DUMP A;` en el shell Pig para mostrar resultados, o `STORE A INTO '/usuario/salida';` para guardar resultados en HDFS.

Para revisar resultados en HDFS:

```bash
hdfs dfs -ls /usuario/salida
hdfs dfs -cat /usuario/salida/part-r-00000
```

---

## Resumen rápido de comandos para correr Pig con Hadoop:

```bash
pig -x mapreduce
# o para correr script
pig -x mapreduce archivo.pig
```

---

¿Quieres que te ayude a instalar/configurar Hadoop para poder usar Pig en modo MapReduce?
