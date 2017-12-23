/*
	MVVM框架中的监听对象属性变化的逻辑，使用的是每一个对象都拥有的definedProperty()的属性，同时为每一个数据
	对象加上getter和setter的方法进行监听数据对象的属性的变化
*/

// 监听对象的构造函数
function Observer(data) {
	this.data = data;
	// 进行监听逻辑的定义
	this.walk(data);
}

Observer.prototype = {
	walk: function(data) {
		var self = this;
		// 取出这个对象的所有的属性进行遍历，包括子属性,进行监听,如以下的结构，对于msg,childObj都会进行
		// 监听
		// data: {
		// 	mag: '',
		// 	obj: {
		// 		childObj: ''
		// 	}
		// }
		Object.keys(data).forEach(function(key) {
			// 通过对象的defineProperty()属性进行每一个属性的监听
			self.defineReactive(data, key, data[key]);
		})
	},
	// 监听逻辑函数
	defineReactive: function(data, key, value) {
		// 为每一个属性定义一个订阅者器，存储所有的订阅者，即存储每一个属性的所有的监听者
		var dep = new Dep();
		// 监听子属性，即当子属性是一个对象的时候，才去监听对象中的每一个属性
		var childObj = observe(value);
		// 通过Object.defineProperty()来监听属性的获取和设置
		Object.defineProperty(data, key, {
			enumerable: true,  // 可枚举
			configurable: false, // 不能进行设置
			// 在get中往订阅器中添加订阅者，订阅者就是要获取这个对象的属性值的对象，还有订阅者存储器是在这里定义的，所以要在getter方法里面进行订阅者的添加
			// 在这里，订阅者就是watcher
			get: function() {
				// 由于需要在闭包里面添加watcher，所以通过Dep定义一个全局的target属性，暂存watcher,添加完移除
				// 同时也要在watcher中定义Dep.target,这里是通过target来进行watcher和observe的关联。
				// 因为一个属性会在多个地方被赋值，即getter,所以要添加target,指向当前订阅者，如果订阅器
				// 中还没有，则添加进去
				// 这里的Dep.target代表着一个在watcherjs中的Watcher实例
				if (Dep.target) {
					dep.depend();
				}
				return value;
			},
			set: function(newValue) {
				if (newValue === value) {
					return;
				}
				console.log("检测到"+data+"的"+value+"发生了变化，新值为"+newValue);
				value = newValue;
				// 如果赋的值是一个对象，要进行监听
				childObj = observe(newValue);
				// 通知订阅者，对象的值发生了改变，调用所有的订阅者的update回调函数进行更新操作
				dep.notify();
			}
		})
	}
}

// 数据监听函数, vm代表一个MVVM实例，value是MVVM实例的data中定义的属性，即我们要监听的属性
function observe(value, vm) {
	// data 数据对象，只会监听vm实例中data对象中的属性的变化
	if (!value || typeof value !== 'object') {
		return;
	}
	// 创建一个监听对象
	return new Observer(value)
}

var uid = 0
// 创建订阅者存储器，便于数据改变了时候，通知所有的订阅者，通过定义的notify方法进行通知,通过addSub方法进行添加订阅者
function Dep() {
	// 为每一个订阅器定义一个id
	this.id = uid++
	// 订阅器
	this.subs = []
}

Dep.prototype = {
	// 添加一个新的订阅者，会在watcherjs中的addDep中调用
	addSub: function(sub) {
		this.subs.push(sub);
	},
	depend: function() {
		// 调用Dep的静态对象的方法进行添加一个订阅者
		// 会调用watcherjs中的定义的addDep()方法，
		// 这里的this，代表着一个Dep实例，即一个订阅者
		Dep.target.addDep(this);
	},
	removeSub: function(sub) {
		var index = this.subs.indexof(sub);
		if (index !== -1) {
			this.subs.splice(index, 1);
		}
	},
	notify: function() {
		// 通知每一个订阅者数据已经发生了改变
		this.subs.forEach(function(sub) {
			sub.update(); // 调用订阅者的update()函数进行view层的更新
		})
	}
}

Dep.target = null;