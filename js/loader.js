define([], function () {
	return function Preloader (objects, callback) {
		result = new Array(objects.length);
		objects.forEach(function (object, i) {
			$.ajax({
				dataType: "text",
				url: object,
				success: function (text) {
					result[i] = text;
					count++;
					if (count == objects.length) {
						callback.apply(this, result);
					}
				}
			});
		});
	};
});