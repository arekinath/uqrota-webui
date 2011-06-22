/**
 * The namespace for model classes
 */
var Model = {};

/**
 * Convenience function for generating getter and setter names
 * example: _fname('get', 'user_names') => 'getUserNames'
 * @param pref	string		prefix
 * @param usep	string		underscore-separated root name 
 */
Model._fname = function(pref, usep) {
	return pref + usep.split("_").collect(function (part) {
			return part.capitalize();
		}).join("");
}