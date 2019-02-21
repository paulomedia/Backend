module.exports  = {};
const models    = require('../models'),
      Boom      = require('boom'),
      Bcrypt    = require('bcrypt'),
      jwt       = require('jsonwebtoken'),
      settings  = require('config'),
      _         = require('lodash'),
      constants = require('./constants'),
      uuidv4    = require('uuid/v4');


const createProduct = async function (request, h) {
    try {
        Object.assign(request.payload, { product_id: uuidv4() });

        return await models.Product.createAsync(request.payload);
    } catch (e) {
        return e;
    }
};

const getProductsByCategory = async (request, h) => {
    let category = request.payload.category;
    category = category.toUpperCase();

    let pagination = request.payload.pagination;
    let elements = pagination.numElements;
    let lastKey = pagination.lastKey;

    let finalResults = [], searchResults, finalObject = {};

    try {
        // elements have to be distinct of zero otherwise dispatch an error
        if ( elements === 0 || _.isUndefined(elements) || !_.isNumber(elements) ){
            elements = 1;
        }

        if ( lastKey === '' || lastKey === ' ' || typeof lastKey !== 'string' ){
            lastKey = undefined;
        }

        // For categories V, B, H, G, L 
        if ( category === 'ZZ' ){        
            let params = {
                ExpressionAttributeNames: { "#category": "category" },
                ExpressionAttributeValues: { ":category": "V", ":category_2": "B", ":category_3": "H", ":category_4": "G", ":category_5": "L" },
                FilterExpression: "#category = :category OR #category = :category_2 OR #category = :category_3 OR #category = :category_4 OR #category = :category_5" 
            };

            if ( _.isUndefined(lastKey) ){
                searchResults = await models.Product.scan()
                    .filterExpression(params.FilterExpression)
                    .expressionAttributeValues(params.ExpressionAttributeValues)
                    .expressionAttributeNames(params.ExpressionAttributeNames)
                    .execAsync();

            } else {
                searchResults = await models.Product.scan()
                    .startKey(lastKey)
                    .filterExpression(params.FilterExpression)
                    .expressionAttributeValues(params.ExpressionAttributeValues)
                    .expressionAttributeNames(params.ExpressionAttributeNames)
                    .execAsync();
            }
            
            for ( let i = 0; i < searchResults.Items.length; ++i ) {
                if ( i < elements ){
                    finalResults.push(searchResults.Items[i]);
                }
            }

            finalObject = {
                Items: finalResults,
                Count: finalResults.length,
                ScannedCount: searchResults.Items.length
            }

            if ( searchResults.Items.length > elements ){
                Object.assign(finalObject, { LastEvaluatedKey: { product_id: _.last(finalResults).attrs.product_id } });
            }

            return finalObject;
        }

        if ( _.isUndefined(lastKey) ){
            searchResults = await models.Product.scan()
                .where('category').equals(category)
                .execAsync();

            for ( let i = 0; i < searchResults.Items.length; ++i ) {
                if ( i < elements ){
                    finalResults.push(searchResults.Items[i]);
                }
            }

            finalObject = {
                Items: finalResults,
                Count: finalResults.length,
                ScannedCount: searchResults.Items.length
            }

            if ( searchResults.Items.length > elements ){
                Object.assign(finalObject, { LastEvaluatedKey: { product_id: _.last(finalResults).attrs.product_id } });
            }

            return finalObject;
            
        } 
    
        searchResults = await models.Product.scan()
            .where('category').equals(category)
            .startKey(lastKey)
            .execAsync(); 
        
        for ( let i = 0; i < searchResults.Items.length; ++i ) {
            if ( i < elements ){
                finalResults.push(searchResults.Items[i]);
            }
        }
        
        finalObject = {
            Items: finalResults,
            Count: finalResults.length,
            ScannedCount: searchResults.Items.length
        }

        if ( searchResults.Items.length > elements ){
            Object.assign(finalObject, { LastEvaluatedKey: { product_id: _.last(finalResults).attrs.product_id } });
        }
            
        return finalObject;

    } catch(e){
        return e;
    }
};

const getProductCategories = async (request, h) => {

    let categories = [];

    try {
        constants.CATEGORIES.forEach(item => {
            if ( item.active ) categories.push(item);
        });

        return categories;

    } catch(e) {
        return e;
    }
};

const getProductDetail = async (request, h) => {

    try {
        let idProduct = request.params.product_id;
        let product = await getProduct(idProduct);

        if (_.isNil(product)) {
            throw Boom.notFound('Product not found');
        }

        return product;
    } catch (e) {
        return e;
    }

};

const searchProduct = async (request, h) => {
    let searchedText = request.params.text;
    searchedText = searchedText.toUpperCase();

    let searchedCategory = request.params.category;
    searchedCategory = _.isUndefined(searchedCategory) ? undefined : searchedCategory.toUpperCase();

    if ( searchedCategory === '' ) {
        searchedCategory = undefined;
    }
    
    try {
        let params = {};

        if ( _.isUndefined(searchedCategory) ){
            Object.assign(params, {
                ExpressionAttributeNames: { "#name": "name" },
                ExpressionAttributeValues: { ":name": searchedText },
                FilterExpression: "contains(#name, :name)"
            });
        } else {
            Object.assign(params, {
                ExpressionAttributeNames: { "#name": "name", "#category": "category" },
                ExpressionAttributeValues: { ":name": searchedText, ":category": searchedCategory },
                FilterExpression: "contains(#name, :name) AND #category = :category"
            });
        }
 
        return await models.Product.scan()
            .filterExpression(params.FilterExpression)
            .expressionAttributeValues(params.ExpressionAttributeValues)
            .expressionAttributeNames(params.ExpressionAttributeNames)
            .execAsync();
        
    } catch (e) {
        return e;
    }

};

const getProduct = async product_id => {
    return new Promise((resolve, reject) => {
        models.Product.get(product_id, {ConsistentRead: true}, function (err, item) {
            if (err || _.isNil(item)) {
                reject(Boom.notFound('Product not found'));
            } else {
                resolve(item);
            }
        });

    });
};

const getProducts = async (request, h) => {
    let pagination = request.payload.pagination;
    let elements = pagination.numElements;
    let lastKey = pagination.lastKey;

    try {
        // elements have to be distinct of zero otherwise dispatch an error
        if ( elements === 0 || _.isUndefined(elements) || !_.isNumber(elements) ){
            elements = 1;
        }

        if ( lastKey === '' || lastKey === ' ' || typeof lastKey !== 'string' ){
            lastKey = undefined;
        }
        
        if ( _.isUndefined(lastKey) ){
            return await models.Product.scan()
                .limit(elements)
                .execAsync(); 
        } 

        return await models.Product.scan()
            .startKey(lastKey)
            .limit(elements)
            .execAsync(); 

    } catch (e) {
        return e;
    }
    
};

module.exports.createProduct = createProduct;
module.exports.getProduct = getProduct;
module.exports.getProducts = getProducts;
module.exports.getProductsByCategory = getProductsByCategory;
module.exports.getProductCategories = getProductCategories;
module.exports.getProductDetail = getProductDetail;
module.exports.searchProduct = searchProduct;