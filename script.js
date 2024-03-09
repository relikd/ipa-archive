var DB = [];
var DB_result = [];
var baseUrls = {};
var PER_PAGE = 30;
var isInitial = true;
var previousSearch = '';
var plistServerUrl = ''; // will append ?d=<data>
NodeList.prototype.forEach = Array.prototype.forEach; // fix for < iOS 9.3

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
    var config = null;
    try {
        config = loadConfig(true);
    } catch (error) {
        alert(error);
    }
    setMessage('Loading base-urls ...');
    loadFile('data/urls.json', setMessage, function (data) {
        baseUrls = JSON.parse(data);
        setMessage('Loading database ...');
        loadFile('data/ipa.json', setMessage, function (data) {
            DB = JSON.parse(data);
            setMessage('ready. Links in database: ' + DB.length);
            if (config && (config.page > 0 || config.search || config.bundleid)) {
                searchIPA(true);
            }
        });
    });
}

function loadConfig(chkServer) {
    if (!location.hash) {
        return; // keep default values
    }
    const params = location.hash.substring(1).split('&');
    const data = {};
    params.forEach(function (param) {
        const pair = param.split('=', 2);
        data[pair[0]] = decodeURIComponent(pair[1]);
    });
    document.querySelectorAll('input,select').forEach(function (input) {
        if (input.type === 'checkbox') {
            input.checked = data[input.id] || null;
        } else {
            input.value = data[input.id] || '';
        }
    });
    if (chkServer && data['plistServer']) {
        setPlistGen();
    }
    return data;
}

function saveConfig() {
    const data = [];
    document.querySelectorAll('input,select').forEach(function (e) {
        const value = e.type === 'checkbox' ? e.checked : e.value;
        if (value) {
            data.push(e.id + '=' + encodeURIComponent(value));
        }
    });
    const prev = location.hash;
    location.hash = '#' + data.join('&');
    return prev !== location.hash;
}

/*
 * Search
 */

function applySearch() {
    const term = document.getElementById('search').value.toLowerCase();
    const bundle = document.getElementById('bundleid').value.trim().toLowerCase();
    const unique = document.getElementById('unique').checked;
    const minos = document.getElementById('minos').value;
    const maxos = document.getElementById('maxos').value;
    const platform = document.getElementById('device').value;
    const minid = document.getElementById('minid').value;

    const minV = minos ? strToVersion(minos) : 0;
    const maxV = maxos ? strToVersion(maxos) : 9999999;
    const device = platform ? 1 << platform : 255; // all flags
    const minPK = minid ? parseInt(minid) : 0;

    // [7, 2,20200,"180","com.headcasegames.180","1.0",1,"180.ipa", 189930], 
    // [pk, platform, minOS, title, bundleId, version, baseUrl, pathName, size]
    DB_result = [];
    isInitial = false;
    const uniqueBundleIds = {};
    DB.forEach(function (ipa, i) {
        if (ipa[2] < minV || ipa[2] > maxV || !(ipa[1] & device) || ipa[0] < minPK) {
            return;
        }
        if (bundle && ipa[4].toLowerCase().indexOf(bundle) === -1) {
            return;
        }
        if (!term
            || ipa[3].toLowerCase().indexOf(term) > -1
            || ipa[4].toLowerCase().indexOf(term) > -1
            || ipa[7].toLowerCase().indexOf(term) > -1
        ) {
            if (unique) {
                const bId = ipa[4];
                if (uniqueBundleIds[bId]) {
                    return;
                }
                uniqueBundleIds[bId] = true;
            }
            DB_result.push(i);
        }
    });
    delete uniqueBundleIds; // free up memory
}

function restoreSearch() {
    location.hash = previousSearch;
    const conf = loadConfig(false);
    previousSearch = '';
    if (conf.random) {
        randomIPA(conf.random);
    } else {
        searchIPA(true);
    }
}

function searchBundle(idx, additional) {
    previousSearch = location.hash + (additional || '');
    document.getElementById('bundleid').value = DB[idx][4];
    document.getElementById('search').value = '';
    document.getElementById('page').value = null;
    document.getElementById('unique').checked = false;
    searchIPA();
}

function searchIPA(restorePage) {
    var page = 0;
    if (restorePage) {
        page = document.getElementById('page').value;
    } else {
        document.getElementById('page').value = null;
    }
    applySearch();
    printIPA((page || 0) * PER_PAGE);
    saveConfig();
}

/*
 * Random IPA
 */

function urlsToImgs(redirectUrl, list) {
    const template = getTemplate('.screenshot');
    var rv = '<div class="carousel">';
    for (var i = 0; i < list.length; i++) {
        rv += renderTemplate(template, { $REF: list[i], $URL: redirectUrl + list[i] });
    }
    return rv + '</div>';
}

function randomIPA(specificId) {
    document.getElementById('search').value = '';
    document.getElementById('bundleid').value = '';
    if (saveConfig() || isInitial || specificId) {
        applySearch();
    }
    var idx = specificId;
    if (!specificId) {
        if (DB_result.length > 0) {
            idx = DB_result[Math.floor(Math.random() * DB_result.length)];
        } else {
            idx = Math.floor(Math.random() * DB.length);
        }
    }
    const entry = entryToDict(DB[idx]);
    const output = document.getElementById('content');
    output.innerHTML = '<h3>Random:</h3>' + entriesToStr('.full', [idx]);
    output.lastElementChild.className += ' single';
    output.innerHTML += renderTemplate(getTemplate('.randomAction'), { $IDX: idx });

    if (!plistServerUrl) {
        output.innerHTML += getTemplate('.no-itunes');
        return;
    }
    // Append iTunes info to result
    const redirectUrl = plistServerUrl + '?r='
    const iTunesUrl = 'https://itunes.apple.com/lookup?bundleId=' + entry.bundleId;
    loadFile(redirectUrl + iTunesUrl, console.error, function (data) {
        const obj = JSON.parse(data);
        if (!obj || obj.resultCount < 1) {
            output.innerHTML += '<p class="no-itunes">No iTunes results.</p>';
            return;
        }
        const info = obj.results[0];
        const imgs1 = info.screenshotUrls;
        const imgs2 = info.ipadScreenshotUrls;
        const device = document.getElementById('device').value || 255;

        var imgStr = '';
        if (imgs1 && imgs1.length > 0 && device & 1) {
            imgStr += '<p>iPhone Screenshots:</p>' + urlsToImgs(redirectUrl, imgs1);
        }
        if (imgs2 && imgs2.length > 0 && device & 2) {
            imgStr += '<p>iPad Screenshots:</p>' + urlsToImgs(redirectUrl, imgs2);
        }

        output.innerHTML += renderTemplate(getTemplate('.itunes'), {
            $VERSION: info.version,
            $PRICE: info.formattedPrice,
            $RATING: info.averageUserRating.toFixed(1),
            $ADVISORY: info.contentAdvisoryRating,
            $DATE: info.currentVersionReleaseDate,
            $GENRES: (info.genres || []).join(', '),
            $URL: info.trackViewUrl,
            $IMG: imgStr,
            $DESCRIPTION: info.description,
        });
    });
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

function getTemplate(name) {
    return document.getElementById('templates').querySelector(name).outerHTML;
}

function renderTemplate(template, values) {
    return template.replace(/\$[A-Z]+/g, function (x) { return values[x]; });
}

function validUrl(url) {
    return encodeURI(url).replace('#', '%23').replace('?', '%3F');
}

function entryToDict(entry) {
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

function entriesToStr(templateType, data) {
    const template = getTemplate(templateType);
    var rv = '';
    for (var i = 0; i < data.length; i++) {
        const entry = entryToDict(DB[data[i]]);
        rv += renderTemplate(template, {
            $IDX: data[i],
            $IMG: entry.img_url,
            $TITLE: (entry.title || '?').replace('<', '&lt;'),
            $VERSION: entry.version,
            $BUNDLEID: entry.bundleId,
            $MINOS: versionToStr(entry.minOS),
            $PLATFORM: platformToStr(entry.platform),
            $SIZE: humanSize(entry.size),
            $URLNAME: entry.pathName.split('/').slice(-1), // decodeURI
            $URL: validUrl(entry.ipa_url),
        });
    }
    return rv;
}

function printIPA(offset) {
    if (!offset) { offset = 0; }

    const total = DB_result.length;
    var content = '<h3>Results: ' + total;
    if (previousSearch) {
        content += ' -- Go to: <a onclick="restoreSearch()">previous search</a>';
    }
    content += '</h3>';
    const page = Math.floor(offset / PER_PAGE);
    const pages = Math.ceil(total / PER_PAGE);
    if (pages > 1) {
        content += paginationShort(page, pages);
    }

    const templateType = document.getElementById('unique').checked ? '.short' : '.entry';
    content += entriesToStr(templateType, DB_result.slice(offset, offset + PER_PAGE));

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
    document.getElementById('page').value = page || null;
    saveConfig();
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
        plistServerUrl = testURL;
        document.getElementById('overlay').hidden = true;
        saveConfig();
    });
}

function urlWithSlash(url) {
    return url.toString().slice(-1) === '/' ? url : (url + '/');
}

function utoa(data) {
    return btoa(unescape(encodeURIComponent(data)));
}

function installIPA(idx) {
    if (!plistServerUrl) {
        document.getElementById('overlay').hidden = false;
        return;
    }
    const thisServerUrl = location.href.replace(location.hash, '');
    const entry = entryToDict(DB[idx]);
    const json = JSON.stringify({
        u: validUrl(entry.ipa_url),
        n: entry.title,
        b: entry.bundleId,
        v: entry.version.split(' ')[0],
        i: urlWithSlash(thisServerUrl) + entry.img_url,
    }, null, 0)
    var b64 = '';
    try {
        b64 = btoa(json);
    } catch (error) {
        b64 = utoa(json);
    }
    while (b64.slice(-1) === '=') {
        b64 = b64.slice(0, -1);
    }
    // window.open(plistServerUrl + '?d=' + b64);
    const plistUrl = plistServerUrl + '%3Fd%3D' + b64; // url encoded "?d="
    window.open('itms-services://?action=download-manifest&url=' + plistUrl);
}
