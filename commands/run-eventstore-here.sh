hostpwd="$(pwd -W 2>/dev/null || pwd)"
docker rm -f kurrentdb
MSYS_NO_PATHCONV=1 docker run --rm -d --name kurrentdb -v "${hostpwd}:/var/lib/eventstore" -p 2113:2113 -p 1113:1113 docker.kurrent.io/kurrent-latest/kurrentdb:latest --db /var/lib/eventstore --insecure --run-projections=System --enable-atom-pub-over-http
