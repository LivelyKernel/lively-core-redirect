var http = require('http'),
    util = require('util'),
    url = require('url'),
    path = require('path');

/* * * * * * *
usage: call with old base url and new base 
node core-redirect/index.js --from="http://lively-kernel.org/core" --to="http://lively-web.org/" --port=4009
* * * * * * */
var argv = require('optimist').argv;

var newBaseURL = url.parse(argv.to),
    oldBaseURL = url.parse(argv.from),
    port = Number(argv.port) || 9101;
function newURL(oldURL, oldBaseURL, newBaseURL) {
    var oldURLCopy = util._extend({}, oldURL),
        pathname = oldURL.pathname;
    if (pathname.indexOf(oldBaseURL.pathname) === 0)
        pathname = newBaseURL.pathname + pathname.slice(
	    oldBaseURL.pathname.length+1)
    return util._extend(oldURLCopy, {
        protocol: newBaseURL.protocol,
        hostname: newBaseURL.hostname,
	host: newBaseURL.host,
        port: newBaseURL.port,
        href: null, path: null,
        pathname: pathname
    });
}

// html rendering
function redirectInfoHTML(options) {
    var from = options.from, to = options.to;
    return util.format(
          "<html>\n"
        + "<head><title>%s has moved</title></head>\n"
        + "<body>\n"
        + "    <h2>The document <a href=\"%s\">%s</a> has moved to <a href=\"%s\">%s</a>.</h2>\n"
        + "    <div>You will be automatically redirected in <span id=\"redirect-time\"></span> seconds.</div>\n"
        + "    <script type=\"application/javascript\">\n"
        + "var secsToWait = 5;\n"
        + "function update() {\n"
        + "    document.getElementById('redirect-time').textContent = secsToWait;\n"
        + "    secsToWait--;\n"
        + "};\n"
        + "update();\n"
        + "var redirectTimer = setInterval(function() {\n"
        + "    if (secsToWait >= 0) update();\n"
        + "    else document.location = '%s'"
        + "}, 1000);\n"
        + "    </script>\n"
        + "</body>\n"
        + "</html>", from, from, from, to, to, to)
}

// rounting
var routes = require('routes'),
    Router = routes.Router,
    Route = routes.Route,
    router = new Router();

router.addRoute('/*', function (req, res) {
    console.log("Redirecting %s", req.url);
    var reqURL = url.parse(req.url),
        serverAddress = req.socket.address();
    reqURL.hostname = serverAddress.address;
    reqURL.port = serverAddress.port;
    reqURL.protocol = 'http';
    var redirectURL = newURL(reqURL, oldBaseURL, newBaseURL),
        body = redirectInfoHTML({
	    from: url.format(reqURL),
	    to: url.format(redirectURL)
	});
    res.writeHead(301, {
      'Content-Length': body.length,
      'Content-Type': 'text/html' });
    res.end(body);
});


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

function site(req, res) {
    var parsed = url.parse(req.url),
        pathname = parsed.pathname,
        normalPathname = path.normalize(pathname).replace(/\\/g, '/'),
        route = router.match(normalPathname);
    if (!route) return res.error(404)
    Object.keys(route).forEach(function (k) {
        req[k] = route[k]
    });
    route.fn(req, res);
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

http.createServer(site).listen(port);

console.log("Started redirect server to route from %s to %s on port %s",
	    url.format(newBaseURL), url.format(oldBaseURL), port);
