var DB = [];
var DB_result = [];
var baseUrls = {};
var PER_PAGE = 30;
var plistGeneratorUrl = ''; // will append ?d=<data>

/*
 * Init
 */

function setMessage(msg) {
    document.getElementById('content').innerHTML = msg;
}

function loadFile(url, onErrFn, fn) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'text';
        xhr.onload = function (e) { fn(e.target.response); };
        xhr.onerror = function (e) { onErrFn('Server or network error.'); };
        xhr.send();
    } catch (error) {
        onErrFn(error);
    }
}

function loadDB() {
    try {
        loadConfig();
    } catch (error) {
        alert(error);
    }
    setMessage('Loading base-urls ...');
    loadFile('data/urls.json', setMessage, function (data) {
        baseUrls = JSON.parse(data);
        setMessage('Loading database ...');
        loadFile('data/ipa.json', setMessage, function (data) {
            DB = JSON.parse(data);
            setMessage(DB.length);
            setMessage('ready. Links in database: ' + DB.length);
        });
    });
}

function loadConfig() {
    const params = location.hash.substring(1).split('&');
    params.forEach(function (param) {
        const pair = param.split('=', 2);
        const key = pair[0];
        const value = pair[1];
        const input = document.getElementById(key);
        if (input) {
            input.value = value;
            if (key == 'plistServer') {
                setPlistGen();
            }
        }
    });
}

function saveConfig() {
    const data = [];
    NodeList.prototype.forEach = Array.prototype.forEach; // fix for < iOS 9.3
    document.querySelectorAll('input,select').forEach(function (e) {
        if (e.value) {
            data.push(e.id + '=' + e.value);
        }
    });
    this.location.hash = '#' + data.join('&');
}

/*
 * Search
 */

function applySearch() {
    const term = document.getElementById('search').value.trim().toLowerCase();
    const bundle = document.getElementById('bundleid').value.trim().toLowerCase();
    const minos = document.getElementById('minos').value;
    const maxos = document.getElementById('maxos').value;
    const platform = document.getElementById('device').value;

    const minV = minos ? strToVersion(minos) : 0;
    const maxV = maxos ? strToVersion(maxos) : 9999999;
    const device = platform ? 1 << platform : 255; // all flags
    const lenBundle = bundle.length;

    // [7, 2,20200,"180","com.headcasegames.180","1.0",1,"180.ipa", 189930], 
    // [pk, platform, minOS, title, bundleId, version, baseUrl, pathName, size]
    DB_result = [];
    DB.forEach(function (ipa, i) {
        if (ipa[2] < minV || ipa[2] > maxV || !(ipa[1] & device)) {
            return;
        }
        if (bundle && ipa[4].substring(0, lenBundle).toLowerCase() !== bundle) {
            return;
        }
        if (!term
            || ipa[3].toLowerCase().indexOf(term) > -1
            || ipa[4].toLowerCase().indexOf(term) > -1
            || ipa[7].toLowerCase().indexOf(term) > -1
        ) {
            DB_result.push(i);
        }
    });
}

function searchByBundleId(sender) {
    document.getElementById('bundleid').value = sender.innerText;
    searchIPA();
}

function searchIPA() {
    applySearch();
    printIPA();
    saveConfig();
}

/*
 * Output
 */

function platformToStr(num) {
    if (!num) { return '?'; }
    return [
        num & (1 << 1) ? 'iPhone' : null,
        num & (1 << 2) ? 'iPad' : null,
        num & (1 << 3) ? 'TV' : null,
        num & (1 << 4) ? 'Watch' : null,
    ].filter(Boolean).join(', ');
}

function versionToStr(num) {
    if (!num) { return '?'; }
    const major = Math.floor(num / 10000);
    const minor = Math.floor(num / 100) % 100;
    const patch = num % 100;
    return major + '.' + minor + (patch ? '.' + patch : '');
}

function strToVersion(versionStr) {
    const x = ((versionStr || '0') + '.0.0.0').split('.');
    return parseInt(x[0]) * 10000 + parseInt(x[1]) * 100 + parseInt(x[2]);
}

function humanSize(size) {
    var sizeIndex = 0;
    while (size > 1024) {
        size /= 1024;
        sizeIndex += 1;
    }
    return size.toFixed(1) + ['kB', 'MB', 'GB'][sizeIndex];
}

function validUrl(url) {
    return encodeURI(url).replace('#', '%23').replace('?', '%3F');
}

function entriesToDict(entry) {
    const pk = entry[0];
    return {
        pk: pk,
        platform: entry[1],
        minOS: entry[2],
        title: entry[3],
        bundleId: entry[4],
        version: entry[5],
        baseUrl: entry[6],
        pathName: entry[7],
        size: entry[8],
        ipa_url: baseUrls[entry[6]] + '/' + entry[7],
        img_url: 'data/' + Math.floor(pk / 1000) + '/' + pk + '.jpg',
    }
}

function entriesToStr(data) {
    const template = document.getElementById('templates').querySelector('.entry').outerHTML;
    var rv = '';
    for (var i = 0; i < data.length; i++) {
        const entry = entriesToDict(DB[data[i]]);
        rv += template
            .replace('$IDX', data[i])
            .replace('$IMG', entry.img_url)
            .replace('$TITLE', (entry.title || '?').replace('<', '&lt;'))
            .replace('$VERSION', entry.version)
            .replace('$BUNDLEID', entry.bundleId)
            .replace('$MINOS', versionToStr(entry.minOS))
            .replace('$PLATFORM', platformToStr(entry.platform))
            .replace('$SIZE', humanSize(entry.size))
            .replace('$URLNAME', entry.pathName.split('/').slice(-1)) // decodeURI
            .replace('$URL', validUrl(entry.ipa_url));
    }
    return rv;
}

function printIPA(offset) {
    if (!offset) { offset = 0; }

    const total = DB_result.length;
    var content = '<p>Results: ' + total + '</p>';
    const page = Math.floor(offset / PER_PAGE);
    const pages = Math.ceil(total / PER_PAGE);
    if (pages > 1) {
        content += paginationShort(page, pages);
    }
    content += entriesToStr(DB_result.slice(offset, offset + PER_PAGE));
    if (pages > 1) {
        content += paginationShort(page, pages);
        content += paginationFull(page, pages);
    }

    document.getElementById('content').innerHTML = content;
    window.scrollTo(0, 0);
}

/*
 * Pagination
 */

function p(page) {
    printIPA(page * PER_PAGE);
}

function paginationShort(page, pages) {
    return '<div class="shortpage">'
        + '<button onclick="p(' + (page - 1) + ')" ' + (page == 0 ? 'disabled' : '') + '>Prev</button>'
        + '<span>' + (page + 1) + ' / ' + pages + '</span>'
        + '<button onclick="p(' + (page + 1) + ')" ' + (page + 1 == pages ? 'disabled' : '') + '>Next</button>'
        + '</div>';
}

function paginationFull(page, pages) {
    var rv = '<div id="pagination">Pages:';
    for (var i = 0; i < pages; i++) {
        if (i === page) {
            rv += '\n<b>' + (i + 1) + '</b>';
        } else {
            rv += '\n<a onclick="p(' + i + ')">' + (i + 1) + '</a>';
        }
    }
    return rv + '</div>';
}

/*
 * Install on iDevice
 */

function setPlistGen() {
    const testURL = document.getElementById('plistServer').value;
    const scheme = testURL.slice(0, 7);
    if (scheme != 'http://' && scheme != 'https:/') {
        alert('URL must start with http:// or https://.');
        return;
    }
    loadFile(testURL + '?d=' + btoa('{"u":"1"}'), alert, function (data) {
        if (data.trim().slice(0, 6) != '<?xml ') {
            alert('Server did not respond with a Plist file.');
            return;
        }
        plistGeneratorUrl = testURL;
        document.getElementById('overlay').hidden = true;
        saveConfig();
    });
}

function urlWithSlash(url) {
    return url.toString().slice(-1) === '/' ? url : (url + '/');
}

function installIpa(idx) {
    if (!plistGeneratorUrl) {
        document.getElementById('overlay').hidden = false;
        return;
    }
    const thisServerUrl = location.href.replace(location.hash, '');
    const entry = entriesToDict(DB[idx]);
    var b64 = btoa(JSON.stringify({
        u: validUrl(entry.ipa_url),
        n: entry.title,
        b: entry.bundleId,
        v: entry.version.split(' ')[0],
        i: urlWithSlash(thisServerUrl) + entry.img_url,
    }, null, 0));
    while (b64.slice(-1) === '=') {
        b64 = b64.slice(0, -1);
    }
    const plistUrl = plistGeneratorUrl + '%3Fd%3D' + b64; // url encoded "?d="
    window.open('itms-services://?action=download-manifest&url=' + plistUrl);
}
