FROM openjdk:8-jdk-slim

LABEL maintainer="Waze Project"
LABEL description="Apache Pig + Hadoop para procesamiento distribuido de datos Waze"
LABEL version="1.0"

# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
# Definición de variables y PATH antes de cualquier COPY que cambie frecuentemente
# Cambiar la versión de Hadoop/Pig invalidará sólo esta capa cuando modifiques HADOOP_VERSION o PIG_VERSION.
# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
ENV JAVA_HOME=/usr/local/openjdk-8
ENV HADOOP_VERSION=3.3.6
ENV PIG_VERSION=0.17.0
ENV HADOOP_HOME=/opt/hadoop
ENV PIG_HOME=/opt/pig
ENV PATH=$PATH:$HADOOP_HOME/bin:$PIG_HOME/bin

# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
#    Instalar herramientas del sistema (apt-get) — esta capa se cachea
#    siempre que no modifiques las dependencias aquí
# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
RUN apt-get update && apt-get install -y \
        wget \
        curl \
        sqlite3 \
        python3 \
        jq \
        procps \
        vim \
    && rm -rf /var/lib/apt/lists/*

# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
#    Crear directorios y descargar/extraer Hadoop y Pig
#    Esta capa se cachea mientras NO cambies HADOOP_VERSION ni PIG_VERSION.
# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
RUN mkdir -p /opt /app/pig /app/db /app/cache/data \
    && cd /opt \
    && wget -q https://downloads.apache.org/hadoop/common/hadoop-${HADOOP_VERSION}/hadoop-${HADOOP_VERSION}.tar.gz \
    && tar -xzf hadoop-${HADOOP_VERSION}.tar.gz \
    && mv hadoop-${HADOOP_VERSION} hadoop \
    && rm hadoop-${HADOOP_VERSION}.tar.gz \
    && wget -q https://downloads.apache.org/pig/pig-${PIG_VERSION}/pig-${PIG_VERSION}.tar.gz \
    && tar -xzf pig-${PIG_VERSION}.tar.gz \
    && mv pig-${PIG_VERSION} pig \
    && rm pig-${PIG_VERSION}.tar.gz

# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
#    Copiar los archivos de configuración (core-site.xml, etc.)  
#    Como éstos cambian con más frecuencia que las versiones de Hadoop/Pig,
#    sólo invalidarán las capas desde aquí hacia abajo, sin re-descargar Hadoop/Pig.
# –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
COPY pig/config/hadoop/core-site.xml    $HADOOP_HOME/etc/hadoop/
COPY pig/config/hadoop/hdfs-site.xml    $HADOOP_HOME/etc/hadoop/
COPY pig/config/hadoop/mapred-site.xml  $HADOOP_HOME/etc/hadoop/
COPY pig/config/hadoop/yarn-site.xml    $HADOOP_HOME/etc/hadoop/

COPY pig/config/pig/pig.properties      $PIG_HOME/conf/

COPY pig/scripts/          /app/scripts/
RUN chmod +x /app/scripts/*.sh

WORKDIR /app

COPY pig/scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["tail", "-f", "/dev/null"]
