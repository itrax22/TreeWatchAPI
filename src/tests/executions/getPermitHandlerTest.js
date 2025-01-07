const getTreePermits = require('../../handlers/getPermitsHandler');

const mockData = {query: {
    page: 1,
    pageSize: 20,
    sortBy: 'lastDateToObject'}
};
getTreePermits.getTreePermits(mockData,{status: function(status) {return {json: function(data) {console.log(data)}}}});