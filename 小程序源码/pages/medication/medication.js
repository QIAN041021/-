// pages/medication/medication.js - 药物记录
const store = require('../../utils/store');
const auth = require('../../utils/auth');
const theme = require('../../utils/theme');
const navDrawer = require('../../utils/nav-drawer');
const guestHome = require('../../utils/guest-home');

function genId(prefix) {
  return prefix + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

function isLoggedIn() {
  var session = auth.getSession();
  return !!(session && session.userId);
}

function tryRecoverStore() {
  if (store.get()) return true;
  try {
    var accounts = wx.getStorageSync('lifeapp_accounts') || [];
    for (var i = accounts.length - 1; i >= 0; i--) {
      var acct = accounts[i];
      if (acct && acct.userId) {
        var raw = wx.getStorageSync('lifeapp_user_' + acct.userId);
        if (raw) {
          wx.setStorageSync('lifeapp_session', { userId: acct.userId, account: acct.account });
          store.init(acct.userId);
          return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

function getHomeData() {
  if (isLoggedIn()) {
    if (!store.get()) store.init(auth.getSession().userId);
    return store.get();
  }
  if (tryRecoverStore()) return store.get();
  return guestHome.get();
}

function requireLogin() {
  if (isLoggedIn()) return true;
  wx.showModal({
    title: '登录后可保存',
    content: '登录微信后可长期保存药物与人物档案。',
    confirmText: '微信登录',
    success(res) {
      if (res.confirm) wx.navigateTo({ url: '/pages/login/login' });
    }
  });
  return false;
}

Page({
  data: {
    themeClass: 'default',
    appFontScale: 1,
    appFontWeight: '400',
    // 侧栏抽屉
    drawerShow: false,
    drawerPages: [],
    drawerRoute: '',
    // 数据
    medProfiles: [],
    medicines: [],
    currentProfileId: '',
    currentProfile: null,
    profileNames: [],
    currentProfileIndex: 0,
    // 人物弹窗
    profileModalVisible: false,
    editingProfileId: '',
    profileForm: { name: '', gender: '男', age: '', birthday: '', allergy: '', history: '' },
    genderOptions: ['男', '女', '保密'],
    // 药物弹窗
    medicineModalVisible: false,
    editingMedicineId: '',
    medicineForm: { image: '', name: '', func: '', usage: '', category: '', buyDate: '', buyNote: '', expiryDate: '', remain: '' },
    categoryOptions: ['西药', '中成药', '中药', '保健品', '外用药', '其他']
  },

  noop() {},

  onLoad() {
    const data = store.get() || {};
    const themeName = (data.settings && data.settings.theme) || 'default';
    this.setData({ themeClass: themeName });
    theme.applyFont(this);
    navDrawer.attach(this);
    this.loadData();
  },

  onShow() {
    const data = store.get();
    if (data && data.settings) {
      const tn = data.settings.theme || 'default';
      if (tn !== this.data.themeClass) this.setData({ themeClass: tn });
      theme.applyFont(this);
    }
    navDrawer.attach(this);
  },

  loadData() {
    const home = getHomeData();
    const profiles = (home && home.medProfiles) || [];
    const medicines = (home && home.medicines) || [];
    const currentId = this.data.currentProfileId || (profiles[0] && profiles[0].id) || '';
    const cur = profiles.find((p) => p.id === currentId) || null;
    this.setData({
      medProfiles: profiles,
      medicines: medicines,
      currentProfileId: currentId,
      currentProfile: cur,
      profileNames: profiles.map((p) => p.name || '未命名'),
      currentProfileIndex: Math.max(0, profiles.findIndex((p) => p.id === currentId))
    });
  },

  // ===== 人物档案 =====
  switchProfile(e) {
    const idx = Number(e.detail.value);
    const p = this.data.medProfiles[idx];
    if (p) {
      this.setData({ currentProfileId: p.id, currentProfile: p, currentProfileIndex: idx });
    }
  },

  openProfileModal() {
    this.setData({
      editingProfileId: '',
      profileForm: { name: '', gender: '男', age: '', birthday: '', allergy: '', history: '' },
      profileModalVisible: true
    });
  },

  closeProfileModal() {
    this.setData({ profileModalVisible: false });
  },

  editProfile() {
    const p = this.data.currentProfile;
    if (!p) return;
    this.setData({
      editingProfileId: p.id,
      profileForm: {
        name: p.name || '',
        gender: p.gender || '男',
        age: p.age || '',
        birthday: p.birthday || '',
        allergy: p.allergy || '',
        history: p.history || ''
      },
      profileModalVisible: true
    });
  },

  onProfileField(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['profileForm.' + field]: e.detail.value });
  },

  selectProfileGender(e) {
    this.setData({ 'profileForm.gender': e.currentTarget.dataset.g });
  },

  onProfileBirthday(e) {
    this.setData({ 'profileForm.birthday': e.detail.value });
  },

  saveProfile() {
    const form = this.data.profileForm;
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    const d = store.get();
    if (!d) {
      requireLogin();
      return;
    }
    const list = (d.medProfiles || []).slice();
    const clean = {
      name: form.name.trim(),
      gender: form.gender,
      age: form.age,
      birthday: form.birthday,
      allergy: form.allergy,
      history: form.history
    };
    if (this.data.editingProfileId) {
      const idx = list.findIndex((p) => p.id === this.data.editingProfileId);
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], clean);
    } else {
      list.push(Object.assign({ id: genId('p_') }, clean));
    }
    d.medProfiles = list;
    store.save();
    const currentId = this.data.editingProfileId || (list[list.length - 1] && list[list.length - 1].id) || '';
    const cur = list.find((p) => p.id === currentId) || null;
    this.setData({
      profileModalVisible: false,
      medProfiles: list,
      currentProfileId: currentId,
      currentProfile: cur,
      profileNames: list.map((p) => p.name || '未命名'),
      currentProfileIndex: Math.max(0, list.findIndex((p) => p.id === currentId))
    });
  },

  deleteProfile() {
    const id = this.data.currentProfileId;
    if (!id) return;
    const that = this;
    wx.showModal({
      title: '删除人物',
      content: '确定删除当前人物档案？',
      success(res) {
        if (!res.confirm) return;
        const d = store.get();
        if (!d) return;
        const list = (d.medProfiles || []).filter((p) => p.id !== id);
        d.medProfiles = list;
        store.save();
        const cur = list[0] || null;
        that.setData({
          medProfiles: list,
          currentProfileId: cur ? cur.id : '',
          currentProfile: cur,
          profileNames: list.map((p) => p.name || '未命名'),
          currentProfileIndex: 0
        });
      }
    });
  },

  // ===== 家用药物记录 =====
  openMedicineModal() {
    this.setData({
      editingMedicineId: '',
      medicineForm: { image: '', name: '', func: '', usage: '', category: '', buyDate: '', buyNote: '', expiryDate: '', remain: '' },
      medicineModalVisible: true
    });
  },

  closeMedicineModal() {
    this.setData({ medicineModalVisible: false });
  },

  editMedicine(e) {
    const id = e.currentTarget.dataset.id;
    const m = this.data.medicines.find((x) => x.id === id);
    if (!m) return;
    this.setData({
      editingMedicineId: id,
      medicineForm: {
        image: m.image || '',
        name: m.name || '',
        func: m.func || '',
        usage: m.usage || '',
        category: m.category || '',
        buyDate: m.buyDate || '',
        buyNote: m.buyNote || '',
        expiryDate: m.expiryDate || '',
        remain: m.remain || ''
      },
      medicineModalVisible: true
    });
  },

  onMedicineField(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['medicineForm.' + field]: e.detail.value });
  },

  selectMedicineCategory(e) {
    this.setData({ 'medicineForm.category': e.currentTarget.dataset.c });
  },

  onMedicineBuyDate(e) {
    this.setData({ 'medicineForm.buyDate': e.detail.value });
  },

  onMedicineExpiry(e) {
    this.setData({ 'medicineForm.expiryDate': e.detail.value });
  },

  chooseImage() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success(res) {
        const temp = res.tempFiles[0].tempFilePath;
        const fs = wx.getFileSystemManager();
        const m = temp.match(/\.(\w+)$/);
        const suffix = m ? m[1] : 'png';
        const saved = wx.env.USER_DATA_PATH + '/med_' + Date.now() + '.' + suffix;
        fs.saveFile({
          tempFilePath: temp,
          filePath: saved,
          success() {
            that.setData({ 'medicineForm.image': saved });
          },
          fail() {
            that.setData({ 'medicineForm.image': temp });
          }
        });
      }
    });
  },

  removeMedicineImage() {
    this.setData({ 'medicineForm.image': '' });
  },

  saveMedicine() {
    const form = this.data.medicineForm;
    if (!form.name || !form.name.trim()) {
      wx.showToast({ title: '请输入药物名称', icon: 'none' });
      return;
    }
    const d = store.get();
    if (!d) {
      requireLogin();
      return;
    }
    const list = (d.medicines || []).slice();
    const clean = {
      image: form.image,
      name: form.name.trim(),
      func: form.func,
      usage: form.usage,
      category: form.category,
      buyDate: form.buyDate,
      buyNote: form.buyNote,
      expiryDate: form.expiryDate,
      remain: form.remain
    };
    if (this.data.editingMedicineId) {
      const idx = list.findIndex((x) => x.id === this.data.editingMedicineId);
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], clean);
    } else {
      list.push(Object.assign({ id: genId('m_') }, clean));
    }
    d.medicines = list;
    store.save();
    this.setData({ medicineModalVisible: false, medicines: list });
  },

  deleteMedicine(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除药物',
      content: '确定删除该药物记录？',
      success(res) {
        if (!res.confirm) return;
        const d = store.get();
        if (!d) return;
        const list = (d.medicines || []).filter((x) => x.id !== id);
        d.medicines = list;
        store.save();
        that.setData({ medicines: list });
      }
    });
  }
});
