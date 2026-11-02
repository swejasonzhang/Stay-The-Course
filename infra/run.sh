#!/bin/sh
# Lambda runs this to start the app (it's the function's "handler"). The Lambda Web Adapter then
# forwards each API Gateway request to the app on port 8080, like a normal web server.
# TieredStopAtLevel=1 makes Java start faster, which shortens cold starts, at some cost to peak speed.
exec java -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -jar app.jar --server.port=8080
