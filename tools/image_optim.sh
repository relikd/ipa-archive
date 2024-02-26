#!/bin/bash
# Convert images from .png to .jpg + reduce resolution + shrink filesize.
MAX_SIZE=128
BATCH_SIZE=50
tmp=()

cd "$(dirname "$0")" || exit


imageOptim() {
    open --new --wait-apps --background -b net.pornel.ImageOptim --args "$@"
}

optimize() {
    if [ "${#tmp[@]}" -ge "$1" ]; then
        echo "imageOptim on ${#tmp[@]} files"
        imageOptim "${tmp[@]}"
        tmp=()
    fi
}

downscale() {
    IN_FILE=$1
    OUT_FILE=${IN_FILE%.png}.jpg
    w=$(sips -g pixelWidth "$IN_FILE" |  cut -d: -f2 | tail -1)
    if [ "$w" -gt $MAX_SIZE ]; then w=$MAX_SIZE; fi
    sips -Z "$w" "$IN_FILE" -s format jpeg -o "$OUT_FILE" 1> /dev/null
    tmp+=("$PWD/$OUT_FILE")
    optimize $BATCH_SIZE
}

# using glob is fine because filenames do not contain spaces
total=$(echo ../data/*/*.png | wc -w)
total=${total##* }
if [ "$total" -lt 2 ]; then
    if [ "$(echo ../data/*/*.png)" = '../data/*/*.png' ]; then
        echo "Nothing to do."
        exit 0;
    fi
fi

i=0
for file in ../data/*/*.png; do
    i=$((i+1))
    echo "[$i/$total] sips $file"
    downscale "$file"
    if [ -f "${file%.png}.jpg" ]; then
        rm "$file"
    fi
done

optimize 1
