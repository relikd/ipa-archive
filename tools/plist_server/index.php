<?php
$X = json_decode(base64_decode($_GET['d']));
header('Access-Control-Allow-Origin: *');
if ($X->u) {
    header('Content-Type: application/xml');
    echo '<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict><key>assets</key><array><dict>
<key>kind</key><string>software-package</string>
<key>url</key><string>'.$X->u.'</string>
</dict><dict>
<key>kind</key><string>display-image</string>
<key>needs-shine</key><false/>
<key>url</key><string>'.$X->i.'</string>
</dict></array><key>metadata</key><dict>
<key>bundle-identifier</key><string>'.$X->b.'</string>
<key>bundle-version</key><string>'.$X->v.'</string>
<key>kind</key><string>software</string>
<key>title</key><string>'.$X->n.'</string>
</dict></dict></array></dict></plist>';
} else {
    echo 'Parsing error.';
}
?>