/*
	compile.js主要做的事情是解析模板指令，将模板中的变量替换成数据，然后初始化渲染页面视图，并将每一个
	指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图，通过为了减少多次进行
	dom的操作，会先把根节点转化成文档碎片fragment进行解析编译，然后在添加到真实的dom节点上
*/

// 编译器的构造函数, vm为
/*
	{
		el: '#app',
		data: {
			str: '',
			child: {
				xin: ''
			},
			msg: ''
		},
		methods: {
			sayHi: function() {
				this.msg = 'hi everyBody'
			}
		}
	}
*/
function Compile(el, vm) {
	// vm为视图模型控制器,即相当于vue实例
	this.$vm = vm
	// 获取绑定的dom节点，其中$el为实例的根节点
	this.$el = this.isElementNode(el) ? el : document.querySelector(el)
	if (this.$el) {
		// 把实例根节点的所有的子节点转化成fragment碎片
		this.$fragment = this.node2Fragment(this.$el)
		// 进行初始化、编译指令和跟新视图的操作
		this.init()
		// 编译完成之后，加回实例根节点
		this.$el.appendChild(this.$fragment)
	}
}

Compile.prototype = {

	init: function() {
		// 编译元素
		this.compileElement(this.$fragment)
	},

	node2Fragment: function(el) {
		var fragment = document.createDocumentFragment();
		var child;
		// 将原生节点拷贝到fragment中
		while(child = el.firstChild) {
			fragment.appendChild(child);
		}
		return fragment;
	},
	// 此方法将遍历所有节点及其子节点，进行扫描解析编译，调用对应的指令渲染函数进行数据渲染，并调用对应的
	// 指令函数进行绑定
	// 如有一下的html模板
	/*
		<div id="app">
			<input type="text" v-model="str">
			<input type="text" v-model="child.str">
			{{str}}<br>
			<span v-text="child.str" class="childClass" v-class="vmClass"></span>
			<input type="text" v-model="msg">
			<p>{{msg}}</p>
			<button v-on:click="sayHi">点击</button>
		</div>
	 */
	compileElement: function(el) {
		var childNodes = el.childNodes, self = this;
		// 编译所有#app下的子节点
		[].slice.call(childNodes).forEach(function(node) {
			var text = node.textContent;
			// 匹配绑定模板语法表达式，形式为{{变量}}
			var reg = /\{\{(.*)\}\}/;

			// 按元素节点方式编译
			// 如果是元素节点
			if (self.isElementNode(node)) {
				// 编译元素节点
				self.compile(node)
			} else if(self.isTextNode(node) && reg.test(text)) {
				// 如果是直接为文本节点中中绑定的指令，如上面的{{str}}
				// RegExp.$1为模板中的变量字符串
				self.compileText(node, RegExp.$1)
			}

			// 遍历子节点
			if (node.childNodes && node.childNodes.length) {
				self.compileElement(node)
			}
		})
	},
	// 解析编译元素节点, 编译元素节点中以属性的形式绑定的语法，规定绑定的语法为v-xxx,如v-test
	compile: function(node) {
		var nodeAttrs = node.attributes, self = this;
		[].slice.call(nodeAttrs).forEach(function(attr) {
			var attrName = attr.name // 属性名
			// 检测是否是指令
			if (self.isDirective(attrName)) {
				var exp = attr.value  // 具体指令所绑定的变量
				var dir = attrName.substring(2); // 获取具体的指令
				if (self.isEventDirective(dir)) {
					// 如果是事件指令,如v-on:click
					compileUtil.eventHandler(node, self.$vm, exp, dir);
				} else {
					// 普通的指令
					console.log(exp, 3)
					compileUtil[dir] && compileUtil[dir](node, self.$vm, exp)
				}
				node.removeAttribute(attrName)
			}
		})
	},

	// 编译文本
	compileText: function(node, exp) {
		compileUtil.text(node, this.$vm, exp);
	},

	// 判断是否是指令
	isDirective: function(attr) {
		return attr.indexOf('v-') == 0;
	},

	// 判断是否是事件指令
	isEventDirective: function(dir) {
		return dir.indexOf('on') == 0;
	},

	// 判断是否是元素节点
	isElementNode: function(node) {
		return node.nodeType == 1;
	},

	// 判断是否是文本节点
	isTextNode: function(node) {
		return node.nodeType == 3;
	}
};

// 指令处理集合, exp代表着指令绑定的变量字段
var compileUtil =  {
	// 绑定文本的指令
	text: function(node, vm, exp) {
		// 解析编译文本指令
		this.bind(node, vm, exp, 'text');
	},

	html: function(node, vm, exp) {
		// 解析编译html指令
		this.bind(node, vm, exp, 'html');
	},

	model: function(node, vm, exp) {
		// 解析编译model指令
		this.bind(node, vm, exp, 'model');
		var self = this;
		var val = this._getVMVal(vm, exp); // 获取监听的属性的值
		// 监听输入事件，输入变化的时候，更新属性的值
		node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            // 值发生改变的时候，进行值得更新操作
            self._setVMVal(vm, exp, newValue);
            val = newValue;
        });
	},


	class: function(node, vm, exp) {
		console.log(exp, 9)
		// 解析编译css指令
		this.bind(node, vm, exp, 'class');
	},

	// 绑定函数
	bind: function(node, vm, exp, dir) {
		console.log(dir, 25)
		// 获取相应的编译函数
		var updateFn = updater[dir+'Updater'];
		if (dir == 'class') {
			console.log(updateFn,666)
		}
		// 第一次初始化视图,即加载页面的时候，初始化视图
		if (updateFn) {
			// 编译相应的元素
			updateFn(node, this._getVMVal(vm, exp, dir));
		}
		// 加载页面完成之后，定义Wacher对实例data中的属性进行监听
		// 实例化订阅者，此操作会在对应的属性消息订阅器中添加了该订阅者watcher
		// 这里的逻辑是，Compile创建一个监听者，由Observer监听到属性变化的时候，调用Watcher中的
		// 回调函数，即下面的第三个函数参数
		new Watcher(vm, exp, function(value, oldValue) {
			// 一旦属性值有变化，会收到通知执行此函数，更新视图
			if (updateFn) {
				updateFn(node, value, oldValue);
			}
		})
	},

	// 事件处理函数
	eventHandler: function(node, vm, exp, dir) {
		// eventType 为事件类型，如click,fn为在MVVM实例的methods中定义的函数，函数名为指令绑定的
		// 变量名exp,如上面的sayHi
		var eventType = dir.split(":")[1],fn = vm.$options.methods && vm.$options.methods[exp];
		if (eventType && fn) {
			// fn.bind(vm)表示事件执行的上下文环境是MVVM的实例，所以在事件处理函数中，可以访问到实例的
			// 其他变量，如data中的各个属性
			node.addEventListener(eventType, fn.bind(vm), false);
		}
	},

	// 获取实例data中定义的属性的值，即获取监听的属性的值
	_getVMVal: function(vm, exp, dir) {
		console.log(exp, 77)
		var val = vm;
		// 把指令绑定的变量获取成单个，如child.xin
		exp = exp.split(".");
		// 如果指令表达式绑定的是一个对象的话，层递拿到最后的属性，如child中的xin
		exp.forEach(function(k) {
			val = val[k];
			// 如果是v-class的话，直接放回指令绑定的变量作为值
			// if (dir == 'class') {
			// 	val = k;
			// }
		})
		return val;
	},

	// 设置MVVM实例中data定义的属性的值，即更新监听的属性的值
	_setVMVal: function(vm, exp, value) {
		var val = vm;
		exp = exp.split('.');
		exp.forEach(function(k, i) {
			// 赋值时，如果在data监听的数据是一个对象的话，如child.xin,则只改变xin不改变child
			if (i < exp.length - 1) {
				// 当监听的属性是对象中的一个属性时，先获取监听的变量的除了最未端的属性child，
				val = val[k];
				// 此时val为child对象
			} else {
				// 获取对象中的属性并进行更新，如child中的xin属性
				val[k] = value;
			}
		})
	}
};

// 更新函数
var updater = {
	textUpdater: function(node, value) {
		node.textContent = typeof value == 'undefined' ? '' : value;
	},
	htmlUpdater: function(node, value) {
		node.innerHTML = typeof value == 'undefined' ? '' : value;
	},
	classUpdater: function(node, value, oldValue) {
		// 获取原生的class，如childClass
		var className = node.className;
		// 把原生class中的旧的v-class和空格去掉
		className = className.replace(oldValue, '').replace(/\s$/, '');
		// 只有在存在原生类名，并且存在新的v-class类名的时候，加上一个空格进行拼接原生class和v-class
		var space = className && String(value) ? ' ' : '';
		// 在原生的class上加上新的v-class,如vmClass
		node.className = className+space+value;
	},
	modelUpdater: function(node, value, oldValue) {
		node.value = typeof value == 'undefined' ? '' : value;
	}
};
