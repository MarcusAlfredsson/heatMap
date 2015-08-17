var map = new L.Map('map', {
    center: [60, 14],
    zoom: 5
});
//don't know if this is needed, but is used to be able to reach layers
var mapLayers = new Array(); 
var queryBuilder = new QueryBuilder(); // from class queryBuilder

$('#pickStartDate').datepicker();
$('#pickEndDate').datepicker();

function animationSteps(startDate, endDate) {
    var startArray = startDate.split('/');
    var endArray = endDate.split('/');
    var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
    var firstDate = new Date(startArray[2],startArray[0],startArray[1]);
    var secondDate = new Date(endArray[2],endArray[0],endArray[1]);
    var dateLength = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
    if (dateLength > 30) {
        dateLength = dateLength/7;
    }
    return dateLength;
}

function setDate() {    
    var heatLayer = mapLayers[0];
    var pointLayer = mapLayers[1];
    var startDate = $('#pickStartDate')[0].value;
    var endDate = $('#pickEndDate')[0].value;
    var dateLength = 128;
    
    if (startDate && endDate) {
        dateLength = animationSteps(startDate, endDate);
    }
    setHeatLayerCss(heatLayer, dateLength);
    var query = queryBuilder.get();
    heatLayer.setSQL(query);
}
function setHeatLayerCss(heatLayer, dateLength) {
    var heatCss = 'Map {-torque-frame-count:'+dateLength+';'+
        '-torque-animation-duration:'+dateLength+';'+
        '-torque-time-attribute:"enddate";'+
        '-torque-aggregation-function:"count(cartodb_id)";'+
        '-torque-resolution:8;'+
        '-torque-data-aggregation:linear;'+
        '}'+
        '#heatmap_geoms_all{'+
        'image-filters: colorize-alpha(blue, cyan, lightgreen, yellow , orange, red);'+
        'marker-file: url(http://s3.amazonaws.com/com.cartodb.assets.static/alphamarker.png);'+
        'marker-fill-opacity: 0.4*[value];'+
        'marker-width: 35;'+
        '}'+
        '#heatmap_geoms_all[frame-offset=1] {'+
        'marker-width:37;'+
        'marker-fill-opacity:0.2; '+
        '}'+
        '#heatmap_geoms_all[frame-offset=2] {'+
        'marker-width:39;'+
        'marker-fill-opacity:0.1; '+
        '}';
        heatLayer.setCartoCSS(heatCss);
}


function isSelected(options, selected) {
    for (var i = 0; i < options.length ;i++){
        if($(options[i]).attr('data') ==selected.attr('data'))
        {
            return true;
        }
    }
    return false;
}

function filterCases(layer) {
    var sql = new cartodb.SQL({user:'marcusalfredsson'});
    var $options = $('#filter_selector li');

    $options.click(function(e) {
        var $selectedOptions = $('#filter_selector').find('.selected');
        var $li = $(e.target);
        if($li.attr('data') ==='all' || 
           $selectedOptions.attr('data') === 'all') {
            $options.removeClass('selected');
        $li.addClass('selected');                
    } else if(isSelected($selectedOptions, $li)){
        $li.removeClass('selected');
        if($('#filter_selector').find('.selected').length == 0) {
            $($options[0]).addClass('selected');
        }
    } else {
        $li.addClass('selected'); 
    }
    filterLayers();

    var query = queryBuilder.get();
    layer.setSQL(query);
});
}

function filterLayers(heatLayer){
    var layerFilters = $('#layer_filter').find('.selected');
    var layerOptions = $('#layer_filter li');
    //if all or none of layer filters are selected
    if(layerFilters.length === 0 || layerOptions.length == layerFilters.length) {
        mapLayers[0].show();
        mapLayers[1].show();  
    } 
    else {
        for (var index = 0; index < layerFilters.length; index++) {
            var option = $(layerFilters[index]).attr('data');
            if(option==='heatLayer') {
                mapLayers[1].hide();
            } else if (option ==='pointLayer') {
                mapLayers[0].hide();
            }
        }
    }
}
function postPoint(coord, animationDate) {
    var form = $('#postPoint_form')[0];
    var point = "ST_SetSRID(ST_Point("+coord.lng+", "+coord.lat+"),4326)";
    var description = form.description.value;
    postQuery("Insert into heatMap_annotation (the_geom, description, animationDate) values ("+point+", '"+description+"', date '"+animationDate+"');");
}
function postQuery(query) {
    var apiKey = "6672cd683d2c4745ede3a71610497ec89c55ecd0";
    var requestUrl = "https://marcusalfredsson.cartodb.com/api/v2/sql?q="+query+"&api_key="+apiKey;
    $.getJSON(requestUrl, function(data) {
        console.log("res", data);
            //if points have been inserted to database
            updatePointLayer();
        });
}

//Updates the map layer of points
function updatePointLayer() {
    var pointLayer = mapLayers[1];
    pointLayer.getSubLayers()[0].setSQL("select * from heatmap_annotation");
}

//Adds the ability to add comments to the map
function addCommentEvent(map, animationLayer, stopMarkers) {
    map.on('contextmenu', function(e) {
        var stopMarker = L.marker(e.latlng, {draggable:true});
        map.addLayer(stopMarker);
        stopMarkers[stopMarker._leaflet_id] = stopMarker;
        animationLayer.pause();

        stopMarker.on('click', function(e) {
            var id = this._leaflet_id;
            var coord = e.latlng;

            var popup = L.popup()
            .setLatLng(e.latlng)
            .setContent('<h1>Lägg till kommentar </h1>'+
                        '<form id="postPoint_form" class="commentForm">'+
                        '<label>Beskriving: </label>'+
                        '<textarea id="textSuggestedStop" name="description" rows="2" cols="40" placeholder="Frivilligt"></textarea>'+
                        '<button type="button" class="commentButton pull-left" onclick="send()">skicka</button>'+
                        '<button type="button" class="commentButton pull-right stopMarkerButton" onclick="{deleteMarker()}">Avbryt</button>'+
                        '</form>');
            stopMarker.bindPopup(popup);

            send = function() {
                var animationDate = animationLayer.getTime().toJSON();
                postPoint(coord, animationDate);
                deleteMarker();
                animationLayer.play();
            }
            deleteMarker = function() {
                map.removeLayer(stopMarkers[id]);
                delete stopMarkers[id];
                map.closePopup();
                animationLayer.play();
            }
        });
});
}

function main() {
    var self = this,
    stopMarkers = new Array();

  //Base map
  L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png').addTo(map);

  //Adding heat map layer
  var heatLayer = cartodb.createLayer(map, 'https://marcusalfredsson.cartodb.com/api/v2/viz/bb624bfc-3b54-11e5-b1bc-0e853d047bba/viz.json', {
    tiles_loader: true,
}).addTo(map);
  heatLayer.done(function(layer) {
    filterCases(layer);

    mapLayers.push(layer);
    addCommentEvent(map, layer, stopMarkers);
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png').addTo(map);
})
  .error(function(err) {
    console.log(err);
});
  var commentLayer = cartodb.createLayer(map, 'https://marcusalfredsson.cartodb.com/api/v2/viz/b4268d1a-3b5b-11e5-9c52-0e4fddd5de28/viz.json', {
    tiles_loader: true,
}).addTo(map);

  commentLayer.done(function(layer) {
    mapLayers.push(layer);

})
  .error(function(err) {
    console.log(err);
});

}
window.onload = main;

