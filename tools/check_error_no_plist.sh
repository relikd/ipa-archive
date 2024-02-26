#!/bin/bash
# Will print all ids where error is set to permanent but a plist exists.
cd "$(dirname "$0")" || exit

while read -r uid; do
    fname="data/$((uid/1000))/$uid"
    if [ -f "../$fname.plist" ]; then echo "$fname.plist"; fi
    if [ -f "../$fname.png" ]; then echo "$fname.png"; fi
    if [ -f "../$fname.jpg" ]; then echo "$fname.jpg"; fi
done < <(sqlite3 ../data/ipa_cache.db 'SELECT pk FROM idx WHERE done=4;')
