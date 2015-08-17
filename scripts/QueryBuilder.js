// QueryBuilder class
var QueryBuilder = function() {}
QueryBuilder.prototype.build = function() {
    var query = this.buildFilterQuery();
    var dateQuery = this.buildDateQuery();
    if(dateQuery && isFilterSelected()) {
        query +=  " and " + dateQuery;   
    } else if (dateQuery) {
        query += " where "+dateQuery;
    }
    return query;
};
QueryBuilder.prototype.get = function() {
    return this.build();
}
QueryBuilder.prototype.buildDateQuery = function() {
    var startdate = $('#pickStartDate')[0].value;
    var endDate = $('#pickEndDate')[0].value;
    var dateQuery;
    if (startdate && endDate) {
        dateQuery = " (startdate >= date '"+startdate+"' and endDate <= date '"+endDate+"')";
    } else if (startdate) {
        dateQuery = "(startdate >= date '"+startdate+"')";
    }else if (endDate) {
        dateQuery = "(endDate <= date '"+endDate+"')";
    }
    return dateQuery;
};
QueryBuilder.prototype.buildFilterQuery = function() {
    var typeFilter = $('#type_filter').find('.selected');
    var orgFilter = $('#org_filter').find('.selected');
    var query = 'SELECT * FROM heatmap_geoms_all';
    var typeSubQuery = this.buildOptionsQuery(typeFilter, 'type');
    var orgSubQuery = this.buildOrgQuery(orgFilter, 'orgid');
    if(typeSubQuery && orgSubQuery){
        query += ' where '+typeSubQuery+' and '+orgSubQuery;
    } else if(typeSubQuery) {
        query += ' where '+typeSubQuery;
    } else if (orgSubQuery) {
        query += ' where '+orgSubQuery;
    }
    return query;
}
QueryBuilder.prototype.buildOptionsQuery = function(options, type){
    var subQuery;
    for (var i = 0; i<options.length; i++) {
        var option = $(options[i]).attr('data');
        if(i===0) {
            subQuery ='(';
        } else {
            subQuery += ' or ';
        }
        subQuery += type+"='"+option+"'";
        if(i===(options.length-1)) {
            subQuery += ')';
}  
}
return subQuery;
}
QueryBuilder.prototype.buildOrgQuery = function(orgOptions){
    var subQuery;
    for(var i = 0; i < orgOptions.length; i++){
        var option = $(orgOptions[i]).attr('data'); 
        if(i===0) {
            subQuery ='(';
        } else {
            subQuery += ' or ';
        }
        if(option ==='private'){
            subQuery += 'orgid=44';
        } else if(option ==='company') {
            subQuery += 'orgid!=44';
        }
        if(i===(orgOptions.length-1)) {
            subQuery += ')';
}  
}
return subQuery;
}
function isArrayEmpty(array) {
    if(typeof array != "undefined" && array != null && array.length > 0) {
        return false;
    } else {
        return true;
    }
}
function isFilterSelected() {
    var typeFilter = $('#type_filter').find('.selected');
    var orgFilter = $('#org_filter').find('.selected');
    
    if(isArrayEmpty(typeFilter) && 
       isArrayEmpty(orgFilter)) {
        return false;
    } else {
        return true;
    }
}