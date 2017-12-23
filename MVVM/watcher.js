/*
  实现Observer和Compile之间的通信桥梁watcher,watcher主要实现的功能是在自身实例化时往属性订阅器dep里面添加
  自己，2.实现一个update()方法，3.待dep.notify()通知时，能调用update()方法，触发Compile中绑定的回调函数

*/

// 监听中枢,vm为MVVM实例如：
/*
	var vm = new MVVM({
		el: '#app',
		data: {
			str: '',
			child: {
				xin: ''
			},
			msg: 'hello'
		},
		methods: {
			sayHi: function() {
				this.msg = 'hi everyBody'
			}
		}
	})
 exp为指令绑定的变量名。即要监听的属性，如str，child.xin，sayHi等，cb为回调函数，即compilejs中new Watcher的回调函数
 */
function Watcher(vm, exp, cb) {
	this.cb = cb;
	this.vm = vm;
	this.exp = exp;
	this.depIds = {};
	// this.getter可以获取到vm实例data中的属性的值
	if (typeof exp === 'function') {
		// 如果data中有定义的属性是一个函数的时候，直接使用这个函数的返回值
		this.getter = exp
	} else {
		this.getter = this.parseGetter(exp);
	}
	// 此处为了触发属性的getter，从而在dep中添加自己
	this.value = this.get();
}

Watcher.prototype =  {
	// 当属性变化的时候。会触发update方法，即会收到属性发生变化的通知
	update: function() {
		this.run();
	},

	run: function() {
		var value = this.get(); // 获取到最新的值
		var oldValue = this.value;
		if (value !== oldValue) {
			this.value = value
			this.cb.call(this.vm, value, oldValue); // 执行Compile中绑定的回调，更新视图
		}
	},

	addDep: function(dep) {
		// 1.每次调用run()的时候，都会触发相应属性的getter，getter里面会触发dep.depend(),继而触发这里的addDep
		// 2.加入相应的属性的dep.id已经在当前的watcher的depIds里，说明不是一个新的属性，仅是改变其值而已
		// 则不需要将当前watcher添加到改属性的dep里
		// // 3. 假如相应属性是新的属性，则将当前watcher添加到新属性的dep里
        // 如通过 vm.child = {name: 'a'} 改变了 child.name 的值，child.name 就是个新属性
        // 则需要将当前watcher(child.name)加入到新的 child.name 的dep里
        // 因为此时 child.name 是个新值，之前的 setter、dep 都已经失效，如果不把 watcher 加入到新的 child.name 的dep中
        // 通过 child.name = xxx 赋值的时候，对应的 watcher 就收不到通知，等于失效了
        // 4. 每个子属性的watcher在添加到子属性的dep的同时，也会添加到父属性的dep
        // 监听子属性的同时监听父属性的变更，这样，父属性改变时，子属性的watcher也能收到通知进行update
        // 这一步是在 this.get() --> this.getVMVal() 里面完成，forEach时会从父级开始取值，间接调用了它的getter
        // 触发了addDep(), 在整个forEach过程，当前wacher都会加入到每个父级过程属性的dep
        // 例如：当前watcher的是'child.child.name', 那么child, child.child, child.child.name这三个属性的dep都会加入当前watcher
		if(!this.depIds.hasOwnProperty(dep.id)) {
			dep.addSub(this);
			this.depIds[dep.id] = dep;
		}

	},

	get: function() {
		Dep.target = this; // 将当前订阅者指向自己,this代表Watcher
		var value =  this.getter.call(this.vm, this.vm);  // 触发getter，添加自己到属性订阅器中，此时会执行observerjs，即被监听到
		Dep.target = null; // 添加完毕，重置
		return value;
	},

	parseGetter: function(exp) {
		// 指令绑定的变量不能以.结束,因为我们会获取.后面的属性进行监听，如果是以.结尾的话，会得到undefined
		if (/[^\w.$]/.test(exp)) {
			return;
		}
		var exps = exp.split('.');
		// 返回一个能够获取对象中的属性值得函数, 每次获取属性的时候，由于使用defineProperty()重写了get,所以都会执行observerjs中get()方法
		return function(obj) {
			for(var i = 0, len = exps.length; i < len; i++) {
				if (!obj) {
					return;
				}
				obj = obj[exps[i]];
			}
			return obj;
		}
	}
}