# The Grand IPA Archive

Hello, this project aims to provide a searchable and filterable index for .ipa files.
None of the linked files are mine, nor am I involved in any capacity on the referenced projects.
I merely wrote the crawler to index IPA files in various [Archive.org](https://archive.org) collections.
The list of indexed collections can be found at [data/urls.json](data/urls.json).


## Using the webpage

You can add the IPA Archive webpage to your homescreen.
Note however, that each time you click on the app icon, it will load the whole database again and clear your previously entered data.
To prevent that, use Safari to jump back to your search results.
The homescreen icon is still useful as bookmark though ;-)

Additionally, your configuration is saved in the URL.
For example, if you have an iPad 1. Gen, you can select device "iPad" and maxOS "5.1.1".
Then click on search and safe that URL to your homescreen.
(Or wait until you have configured your Plist server and save that URL instead)


## TODO

- Reindexing of previous URLs (should remove dead-links and add new ones)
- Periodic check on outdated URLs (see previous)


## Requirements

- `ipa_archive.py` has a dependency on [RemoteZip](https://github.com/gtsystem/python-remotezip) (`pip install remotezip`)
- `image_optim.sh` uses [ImageOptim](https://github.com/ImageOptim/ImageOptim) (and probably requires a Mac)
- The [Plist Generator server](#starting-plist-server) needs either Python or PHP


## General workflow

To add files to the archive follow these steps:

1. `python3 ipa_archive.py add URL`
2. `python3 ipa_archive.py run`
3. If any of the URLs failed, check if it can be fixed. (though most likely the ipa-zip file is broken)
    - If you could fix any file, run `python3 ipa_archive.py err reset` to try again (this will also print the error again)
    - If some files are unfixable, run `python3 ipa_archive.py set err ID1 ID2` to ignore them
4. `./tools/image_optim.sh` (this will convert all .png files to .jpg)
5. `python3 ipa_archive.py export json`

Handling plist errors (json-like format):
- `./tools/plist_convert.sh 21968`
- `./ipa_archive.py get img 21968`


## Database schema

The column `done` is encoded as follows:
- `0` (queued, needs processing)
- `1` (done)
- `3` (error, maybe fixable, needs attention)
- `4` (error, unfixable, ignore in export)


## Starting Plist Server

You need to start the plist generator service on a network location that is accessible to your iDevice.
That can be, for example, your local machine which is accissble through your home network (LAN).
Therefore you will need to determine the IP address of your hosting PC.
You can either use Python or PHP to host the service.

(it is sufficient to copy and execute one of server files, either python or php)


### ... with Python

With python, the IP address *should* be determined automatically.
After starting the server:

```sh
python3 tools/plist_server.py
```

it will print out something like `Server started http://192.168.0.1:8026`.
Use this address on the IPA Archive webpage.
If the IP starts with `127.x.x.x` or `10.x.x.x`, you will need to find the IP address manually and use that instead.


### ... with PHP

Similar to python, you start the server with:

```sh
php -S 0.0.0.0:8026 -t tools/plist_server
```

However, you have to find your local IP address manually (Mac: `ipconfig getifaddr en0`).
Note, we use `0.0.0.0` instead of localhost, to make the server available to other network devices.
If you are inside the `plist_server` folder, you can omit the `-t` flag.

For the IPA Archive webpage you should use `http://192.168.0.1:8026` (with your own IP address).

