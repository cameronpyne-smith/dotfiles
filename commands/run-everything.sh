new_tab() {
    wt -w 0 new-tab --title "$2" pwsh -NoExit -c "$1"
}

new_tab run-eventstore-grpc Eventstore
new_tab run-elastic Elastic
new_tab run-kibana Kibana
