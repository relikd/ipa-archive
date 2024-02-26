#!/bin/sh
# Some Info.plist files are in a json-like format. This will convert them to XML.
cd "$(dirname "$0")" || exit

if [ $# = 0 ]; then
    echo 'Missing uid(s) parameter'
    exit 0
fi

for uid in "$@"; do
    fname=data/$((uid/1000))/$uid.plist
    if [ -f "$fname" ]; then
        res=$(/usr/libexec/PlistBuddy -x -c print "../$fname")
        if [ $? ]; then
            echo "overwrite $fname"
            echo "$res" > "../$fname"
        fi
    else
        echo "does not exist: $fname"
    fi
done
