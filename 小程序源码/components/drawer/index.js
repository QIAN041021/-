// components/drawer/index.js - 侧栏抽屉组件
Component({
  properties: {
    show: { type: Boolean, value: false },
    pages: { type: Array, value: [] }
  },
  methods: {
    onMaskTap() {
      this.triggerEvent('close');
    },
    // 阻止点击面板冒泡到遮罩导致关闭
    noop() {},
    onItemTap(e) {
      var index = e.currentTarget.dataset.index;
      var item = this.data.pages[index];
      this.triggerEvent('navigate', { item: item });
    }
  }
});
