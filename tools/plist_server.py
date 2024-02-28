#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
from base64 import b64decode
import socket
import json


def generatePlist(data: dict) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict><key>assets</key><array><dict>
<key>kind</key><string>software-package</string>
<key>url</key><string>{data.get('u')}</string>
</dict><dict>
<key>kind</key><string>display-image</string>
<key>needs-shine</key><false/>
<key>url</key><string>{data.get('i')}</string>
</dict></array><key>metadata</key><dict>
<key>bundle-identifier</key><string>{data.get('b')}</string>
<key>bundle-version</key><string>{data.get('v')}</string>
<key>kind</key><string>software</string>
<key>title</key><string>{data.get('n')}</string>
</dict></dict></array></dict></plist>'''  # noqa: E501


class PlistServer(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            b64 = self.path.split('?d=')[-1] + '=='
            data = json.loads(b64decode(b64))  # type: dict
            rv = generatePlist(data)
        except Exception as e:
            print(e)
            rv = ''
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        if rv:
            self.send_header('Content-type', 'application/xml')
        self.end_headers()
        self.wfile.write(bytes(rv, 'utf-8') if rv else b'Parsing error')


def getLocalIp():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(('10.255.255.255', 80))
    ip = s.getsockname()[0]
    s.close()
    return ip


if __name__ == '__main__':
    webServer = HTTPServer(('0.0.0.0', 8026), PlistServer)
    print('Server started http://%s:%s' % (getLocalIp(), 8026))
    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass
    webServer.server_close()
