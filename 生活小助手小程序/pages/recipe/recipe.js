const store = require('../../utils/store');
const auth = require('../../utils/auth');
const theme = require('../../utils/theme');
const navDrawer = require('../../utils/nav-drawer');

function ensureStore() {
  if (!store.get()) {
    const s = auth.getSession();
    if (s && s.userId) store.init(s.userId);
  }
}

function getIngredientCat(name, ingredients) {
  const item = ingredients.find((i) => i.name === name);
  return item ? 'cat-' + item.cat : 'cat-other';
}

function svg(vb, content) {
  return (
    'data:image/svg+xml,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" fill="none">' + content + '</svg>')
  );
}
const EMPTY_THUMB = svg(
  '0 0 24 24',
  '<path d="M5 4H10V20H5V4Z" fill="#F4B8B8" fill-opacity="0.3"/><path d="M14 4H19V20H14V4Z" fill="#D99B9B" fill-opacity="0.3"/><path d="M5 4H10V20H5V4Z" stroke="#F4B8B8" stroke-width="1"/><path d="M14 4H19V20H14V4Z" stroke="#D99B9B" stroke-width="1"/>'
);

Page({
  data: {
    themeClass: 'default',
    appFontScale: 1,
    appFontWeight: '400',
    emptyThumb: EMPTY_THUMB,
    ingredients: [],
    ingredientCount: '',
    recipes: [],
    recipeFilter: 'all',
    // 食材弹窗
    showIngredientModal: false,
    ingName: '',
    ingCat: 'vegetable',
    // 菜谱弹窗
    showRecipeModal: false,
    recipeName: '',
    recipeImage: '',
    recipeSteps: '',
    tempIngredients: [],
    recipeIngredientInput: '',
    // 菜谱详情
    recipeDetail: null
  },

  onShow() {
    var app = getApp();
    this.setData({ themeClass: (app.globalData.currentTheme || 'default') });
    if (this.getTabBar()) this.getTabBar().refreshBar();
    theme.applyFont(this);
    navDrawer.attach(this);
    ensureStore();
    this.refresh();
  },

  noop() {},

  refresh() {
    const data = store.get();
    if (!data) return;
    this.renderIngredients();
    this.renderRecipes();
  },

  renderIngredients() {
    const data = store.get();
    this.setData({
      ingredients: data.ingredients,
      ingredientCount: data.ingredients.length + '种食材'
    });
  },

  renderRecipes() {
    const data = store.get();
    const list = data.recipes.map((r) => {
      const canMake = r.ingredients.every((ing) =>
        data.ingredients.some((i) => i.name === ing)
      );
      const missing = r.ingredients.filter(
        (ing) => !data.ingredients.some((i) => i.name === ing)
      ).length;
      const tags = r.ingredients.slice(0, 3).map((ing) => ({
        name: ing,
        cat: getIngredientCat(ing, data.ingredients)
      }));
      return { ...r, canMake, missing, tags };
    });
    this.setData({ recipes: list });
  },

  removeIngredient(e) {
    const name = e.currentTarget.dataset.name;
    const data = store.get();
    data.ingredients = data.ingredients.filter((i) => i.name !== name);
    store.save();
    this.renderIngredients();
    this.renderRecipes();
  },

  // ===== 食材弹窗 =====
  openIngredientModal() {
    this.setData({ showIngredientModal: true, ingName: '', ingCat: 'vegetable' });
  },
  closeIngredientModal() {
    this.setData({ showIngredientModal: false });
  },
  onIngredientName(e) { this.setData({ ingName: e.detail.value }); },
  selectIngredientCat(e) {
    this.setData({ ingCat: e.currentTarget.dataset.cat });
  },
  confirmAddIngredient() {
    const name = (this.data.ingName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写食材名称', icon: 'none' });
      return;
    }
    const data = store.get();
    if (data.ingredients.some((i) => i.name === name)) {
      wx.showToast({ title: '该食材已存在', icon: 'none' });
      return;
    }
    data.ingredients.push({ name, cat: this.data.ingCat });
    store.save();
    this.setData({ showIngredientModal: false });
    this.renderIngredients();
    this.renderRecipes();
  },

  // ===== 菜谱筛选 =====
  toggleRecipeFilter(e) {
    this.setData({ recipeFilter: e.currentTarget.dataset.mode });
  },

  // ===== 菜谱弹窗 =====
  openRecipeModal() {
    this.setData({
      showRecipeModal: true,
      recipeName: '',
      recipeImage: '',
      recipeSteps: '',
      tempIngredients: [],
      recipeIngredientInput: ''
    });
  },
  closeRecipeModal() {
    this.setData({ showRecipeModal: false });
  },
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({ recipeImage: file.tempFilePath });
      }
    });
  },
  onRecipeName(e) { this.setData({ recipeName: e.detail.value }); },
  onRecipeSteps(e) { this.setData({ recipeSteps: e.detail.value }); },
  onRecipeIngredientInput(e) {
    const v = e.detail.value;
    // 输入逗号即拆分添加
    if (v.indexOf(',') !== -1 || v.indexOf('，') !== -1) {
      const parts = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      this.addTempIngredients(parts);
      this.setData({ recipeIngredientInput: '' });
    } else {
      this.setData({ recipeIngredientInput: v });
    }
  },
  addTempIngredients(parts) {
    const data = store.get();
    let list = this.data.tempIngredients.slice();
    parts.forEach((p) => {
      if (!list.some((x) => x.name === p)) {
        list.push({ name: p, cat: getIngredientCat(p, data.ingredients) });
      }
    });
    this.setData({ tempIngredients: list });
  },
  addTempIngredientFromInput() {
    const v = (this.data.recipeIngredientInput || '').trim();
    if (!v) return;
    this.addTempIngredients([v]);
    this.setData({ recipeIngredientInput: '' });
  },
  removeTempIngredient(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({
      tempIngredients: this.data.tempIngredients.filter((i) => i.name !== name)
    });
  },
  confirmAddRecipe() {
    const name = (this.data.recipeName || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写菜名', icon: 'none' });
      return;
    }
    let names = this.data.tempIngredients.map(function (t) { return t.name; });
    const inputVal = (this.data.recipeIngredientInput || '').trim();
    if (inputVal) {
      inputVal.split(/[,，]/).map((s) => s.trim()).filter(Boolean).forEach((p) => {
        if (names.indexOf(p) === -1) names.push(p);
      });
    }
    if (!names.length) {
      wx.showToast({ title: '请至少添加一种食材', icon: 'none' });
      return;
    }
    const data = store.get();
    data.recipes.push({
      name,
      ingredients: names,
      image: this.data.recipeImage,
      steps: (this.data.recipeSteps || '').trim()
    });
    store.save();
    this.setData({ showRecipeModal: false });
    this.renderRecipes();
  },

  deleteRecipe(e) {
    const idx = e.currentTarget.dataset.index;
    const data = store.get();
    data.recipes.splice(idx, 1);
    store.save();
    this.renderRecipes();
  },

  // ===== 菜谱详情 =====
  openRecipeDetail(e) {
    const idx = e.currentTarget.dataset.index;
    const r = this.data.recipes[idx];
    if (!r) return;
    const stepList = (r.steps || '')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    this.setData({
      recipeDetail: {
        name: r.name,
        image: r.image || '',
        ingredients: (r.ingredients || []).map((ing) => ({
          name: ing,
          cat: getIngredientCat(ing, store.get().ingredients)
        })),
        stepList: stepList
      }
    });
  },
  closeRecipeDetail() {
    this.setData({ recipeDetail: null });
  }
});
