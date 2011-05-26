/**
 * @author Alex Wilson
 */

Model.User = Class.create(Resource, {});
Model.User.cache = {};
Model.User.get = function(id, callback) {
	Resource.get_auth(Model.User, '/user/'+id+'.json', id, callback);
}
Model.User.count = function(conditions, callback) {
	Resource.count('/user/count.json', conditions, callback);
}
