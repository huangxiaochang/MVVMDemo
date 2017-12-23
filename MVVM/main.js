/*
	这里是MVVM数据绑定的入口，整合Observer,Compile和Watcher三者，通过Obesrver来监听自己的model数据变化
	通过Compile来解析编译模板指令，最终利用Watcher搭建Observer和Compile之间通信的桥梁，达到双向交互的功能
*/
// 当使用 var vm =	new MVVM() 也就是创建了一个实例，即相当于vue实例，则vm代表着一个vue实例
// options的配置可以是
// {
// 		el代表vm的作用域，即只能监听到在el的dom节点下面绑定的指令才能自动更新
// 		el: #app, 
// 		监听data中定义的属性的变化，不在data中定义的数据，不会自动监听到他的变化
// 		data: {
// 			name: "eret"
// 		}
// 	}
function MVVM(options) {
	this.$options = options || {};
	var data = this._data = this.$options.data, self = this;
	// 为了能以vm.xxx = xx而不是vm._data.xxx = xx的形式进行监听数据的变化，对options.data进行属性代理
	Object.keys(data).forEach(function(k) {
		self._proxy(k)
	})
	// 监听data中属性的变化
	observe(data, this);
	// 创建编译器，会通过watcher来得知属性的变化，然后进行属性的更新
	this.$compile = new Compile(options.el || document.body, this);
}

MVVM.prototype = {
	_proxy: function(key) {
		var self = this;
		Object.defineProperty(self, key, {
			configurable: false,
			enumerable: true,
			get: function() {
				return self._data[key];
			},
			set: function(newValue) {
				self._data[key] = newValue;
			}
		})
	}
}