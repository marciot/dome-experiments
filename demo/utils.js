/* Decode the query variable */
function parseQuery(url) {
    var vars = (url || window.location.search).substring(1).split("&");
    var query = {};
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        query[pair[0]] = pair[1];
    }
    return query;
}

/* Dynamically load a css or js object
 * 
 * Examples:
 *    loadResource("myscript.js")
 *    loadResource("mystyle.css")
 *
 *  Reference:
 *    http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
 */
function loadResource(filename, async){
    if (endsWith(filename, ".js") || endsWith(filename, ".js.gz")){
        //if filename is a external JavaScript file
        var fileref = document.createElement('script')
        fileref.setAttribute("type","text/javascript")
        fileref.setAttribute("src", filename)
        if(async == "defer") {
            fileref.setAttribute("defer", "defer");
        } else if(async) {
            fileref.setAttribute("async", "async");
        }
    } else if (endsWith(filename, ".css") || endsWith(filename, ".css.gz")) {
        //if filename is an external CSS file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    } else if (endsWith(filename, ".html") || endsWith(filename, ".html.gz")) {
        //if filename is an external HTML file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "import")
        fileref.setAttribute("href", filename)
    }
    if (typeof fileref != "undefined") {
        document.getElementsByTagName("head")[0].appendChild(fileref)
    }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}