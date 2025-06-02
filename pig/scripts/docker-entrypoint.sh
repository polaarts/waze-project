#!/bin/bash
set -e

echo "Iniciando contenedor Apache Pig para proyecto Waze..."

export JAVA_HOME=/usr/local/openjdk-8
export HADOOP_HOME=/opt/hadoop
export PIG_HOME=/opt/pig
export PATH=$PATH:$HADOOP_HOME/bin:$PIG_HOME/bin

mkdir -p /tmp/pig-temp /tmp/pig_schema

echo "Variables de entorno configuradas:"
echo "   - JAVA_HOME: $JAVA_HOME"
echo "   - HADOOP_HOME: $HADOOP_HOME"
echo "   - PIG_HOME: $PIG_HOME"


echo "Contenedor Pig listo para ejecutar scripts"
echo ""
echo "Comandos disponibles:"
echo "   - docker exec -it waze-pig pig -f /app/pig/scripts/filtering.pig"
echo "   - docker exec -it waze-pig pig -f /app/pig/scripts/analysis_geographic_patterns.pig"
echo "   - docker exec -it waze-pig bash /app/scripts/run_filtering.sh"
echo "   - docker exec -it waze-pig bash /app/scripts/run_analysis.sh"

exec "$@"
