#!/bin/bash
# Find files where a plist exists but an image is missing (should be run after image_optim).
cd "$(dirname "$0")" || exit

for file in ../data/*/*.plist; do
    if [ ! -f "${file%.plist}.jpg" ]; then
        idx=${file##*/}
        echo "${idx%.*}";
    fi;
done
