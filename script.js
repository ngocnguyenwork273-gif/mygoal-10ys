const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
const SO_NGAY_CANH_BAO = 7;

// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyA7X8J8LjHVIL0Pni36_YYo5-TrFIbn86E",
  authDomain: "my-goal-10s.firebaseapp.com",
  projectId: "my-goal-10s",
  storageBucket: "my-goal-10s.firebasestorage.app",
  messagingSenderId: "911449251066",
  appId: "1:911449251066:web:577f8e4cb87ee74092bd43",
  measurementId: "G-XPGRNXJFG1"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let appData = { ten: '', mucTieu: [], nhatKy: [] };
let dangTaiLanDau = true;
let huyLangNgheFirestore = null;

// ===== Lưu dữ liệu lên Firestore (thay cho localStorage.setItem) =====
function luuDuLieu(data) {
  const user = auth.currentUser;
  if (!user) return;
  db.collection('nguoiDung').doc(user.uid).set(data).catch(err => {
    console.error('Lỗi khi lưu dữ liệu:', err);
  });
}

// ===== Bắt đầu lắng nghe dữ liệu theo thời gian thực (thay cho taiDuLieu) =====
function batDauDongBo(user) {
  if (huyLangNgheFirestore) huyLangNgheFirestore();
  dangTaiLanDau = true;
  huyLangNgheFirestore = db.collection('nguoiDung').doc(user.uid)
    .onSnapshot(doc => {
      if (doc.exists) {
        appData = doc.data();
        if (!appData.mucTieu) appData.mucTieu = [];
        if (!appData.nhatKy) appData.nhatKy = [];
      } else {
        appData = { ten: '', mucTieu: [], nhatKy: [] };
      }
      renderTatCa();
      dangTaiLanDau = false;
    }, err => {
      console.error('Lỗi đồng bộ dữ liệu:', err);
    });
}

// ===== Xử lý đăng nhập / đăng xuất =====
const manHinhDangNhap = document.getElementById('man-hinh-dang-nhap');
const oDnEmail = document.getElementById('dn-email');
const oDnMatKhau = document.getElementById('dn-mat-khau');
const dnLoi = document.getElementById('dn-loi');

document.getElementById('btn-dang-nhap').addEventListener('click', () => {
  dnLoi.textContent = '';
  const email = oDnEmail.value.trim();
  const matKhau = oDnMatKhau.value;
  if (!email || !matKhau) { dnLoi.textContent = 'Nhập đủ email và mật khẩu nhé!'; return; }
  auth.signInWithEmailAndPassword(email, matKhau).catch(err => {
    dnLoi.textContent = 'Sai email hoặc mật khẩu, thử lại nhé!';
  });
});
oDnMatKhau.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-dang-nhap').click();
});

document.getElementById('btn-dang-xuat').addEventListener('click', () => {
  if (!confirm('Đăng xuất khỏi app?')) return;
  auth.signOut();
});

auth.onAuthStateChanged(user => {
  if (user) {
    document.body.classList.remove('chua-dang-nhap');
    manHinhDangNhap.classList.add('an');
    document.getElementById('dang-nhap-la').textContent = `Đang đăng nhập: ${user.email}`;
    batDauDongBo(user);
  } else {
    document.body.classList.add('chua-dang-nhap');
    manHinhDangNhap.classList.remove('an');
    if (huyLangNgheFirestore) { huyLangNgheFirestore(); huyLangNgheFirestore = null; }
    oDnEmail.value = '';
    oDnMatKhau.value = '';
  }
});

const ICON_LOAI = {
  'Sự nghiệp & Tài chính': { icon: '💼', lop: 'loai-sunghiep' },
  'Sức khỏe & Thể chất': { icon: '💪', lop: 'loai-suckhoe' },
  'Phát triển bản thân & Học tập': { icon: '📚', lop: 'loai-phattrien' },
  'Ước nguyện của tôi': { icon: '💫', lop: 'loai-uocnguyen' }
};

function giaiDoan(phanTram) {
  if (phanTram >= 1) return 'truong-thanh';
  if (phanTram >= 0.34) return 'dang-lon';
  return 'mam';
}
function iconGiaiDoan(gd) {
  return gd === 'truong-thanh' ? '🌳' : gd === 'dang-lon' ? '🌿' : '🌱';
}
function parseSoGio(chuoi) {
  return chuoi.split('+').reduce((t, p) => t + (parseFloat(p.trim()) || 0), 0);
}
function tinhKhoangCach(tuMs, denMs) {
  if (!denMs) return '';
  const soNgay = Math.round((denMs - tuMs) / MOT_NGAY_MS);
  if (soNgay < 0) return '⚠️ Đã quá hạn dự kiến';
  const nam = Math.floor(soNgay / 365);
  const thang = Math.floor((soNgay % 365) / 30);
  const ngay = soNgay % 30;
  let kq = [];
  if (nam > 0) kq.push(nam + ' năm');
  if (thang > 0) kq.push(thang + ' tháng');
  if (nam === 0 && thang === 0) kq.push(ngay + ' ngày');
  return '≈ ' + kq.join(' ') + ' kể từ hôm nay';
}
function conBaoNhieuNgay(ngayDuKien) {
  if (!ngayDuKien) return null;
  return Math.ceil((ngayDuKien - Date.now()) / MOT_NGAY_MS);
}
function datSoDem(el, ketThuc, hauTo) {
  hauTo = hauTo || '';
  const batDau = parseFloat(el.textContent) || 0;
  const thoiGian = 450;
  const tGio = performance.now();
  function buoc(now) {
    const tienDo = Math.min((now - tGio) / thoiGian, 1);
    el.textContent = Math.round(batDau + (ketThuc - batDau) * tienDo) + hauTo;
    if (tienDo < 1) requestAnimationFrame(buoc);
  }
  requestAnimationFrame(buoc);
}

// ================= ĐIỀU HƯỚNG SIDEBAR =================
document.querySelectorAll('.muc-menu').forEach(btn => {
  btn.addEventListener('click', () => chuyenTrang(btn.dataset.trang));
});
function chuyenTrang(ten) {
  document.querySelectorAll('.muc-menu').forEach(b => b.classList.toggle('active', b.dataset.trang === ten));
  document.querySelectorAll('.trang').forEach(s => s.classList.toggle('active', s.id === 'trang-' + ten));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.getElementById('btn-xem-tat-ca').addEventListener('click', () => chuyenTrang('muc-tieu'));

// ================= LỜI CHÀO + GIỜ =================
function capNhatLoiChao() {
  const gio = new Date().getHours();
  const bieuTuong = gio < 6 ? '🌙' : gio < 12 ? '☀️' : gio < 18 ? '🌤️' : '🌆';
  document.getElementById('loi-chao').innerHTML =
    `Chào ${appData.ten ? appData.ten : 'bạn'} <span id="icon-thoi-tiet">${bieuTuong}</span>`;
  document.getElementById('ten-nguoi-dung').value = appData.ten || '';
}

// ================= MODAL THÊM / SỬA MỤC TIÊU =================
const lopPhuModal = document.getElementById('lop-phu-modal');
const oNgayDuKien = document.getElementById('ngay-du-kien');
const spanKhoangThoiGian = document.getElementById('khoang-thoi-gian-text');
const oGhiChuDien = document.getElementById('ghi-chu-dien');
let uuTienDaChon = 'Cao';
let dangSuaId = null;

document.getElementById('chi-tieu-gio').addEventListener('input', function () {
  this.value = this.value.replace(/[^0-9]/g, '');
});

function moModalThem() {
  dangSuaId = null;
  document.getElementById('tieu-de-modal').textContent = '🌱 Gieo hạt mục tiêu mới';
  document.getElementById('btn-them-muc-tieu').textContent = '🐼 Gieo hạt';
  document.getElementById('ten-muc-tieu').value = '';
  document.getElementById('loai-muc-tieu').value = 'Sự nghiệp & Tài chính';
  document.getElementById('chi-tieu-gio').value = '';
  oGhiChuDien.innerHTML = '';
  oNgayDuKien.value = '';
  spanKhoangThoiGian.textContent = '';
  document.querySelectorAll('.nut-uu-tien').forEach(b => b.classList.toggle('active', b.dataset.gt === 'Cao'));
  uuTienDaChon = 'Cao';
  document.getElementById('khu-phan-chi-danh-cho-sua').classList.add('an');
  lopPhuModal.classList.remove('an');
}
function suaMucTieu(id) {
  const m = appData.mucTieu.find(x => x.id === id);
  dangSuaId = id;
  document.getElementById('tieu-de-modal').textContent = '🔍 Chi tiết mục tiêu';
  document.getElementById('btn-them-muc-tieu').textContent = '💾 Lưu thay đổi';
  document.getElementById('ten-muc-tieu').value = m.ten;
  document.getElementById('loai-muc-tieu').value = m.loai;
  document.querySelectorAll('.nut-uu-tien').forEach(b => b.classList.toggle('active', b.dataset.gt === m.uuTien));
  uuTienDaChon = m.uuTien;
  document.getElementById('chi-tieu-gio').value = m.chiTieu;
  oNgayDuKien.value = m.ngayDuKien ? new Date(m.ngayDuKien).toISOString().slice(0, 10) : '';
  spanKhoangThoiGian.textContent = m.ngayDuKien ? tinhKhoangCach(Date.now(), m.ngayDuKien) : '';
  oGhiChuDien.innerHTML = m.ghiChu || '';
  document.getElementById('khu-phan-chi-danh-cho-sua').classList.remove('an');
  renderLichSuTuoiTrongModal(id);
  renderLichSuSuaTrongModal(id);
  lopPhuModal.classList.remove('an');
}

// ===== Tính lại tổng giờ tích lũy từ nhật ký (nguồn dữ liệu gốc duy nhất) =====
function tinhLaiTichLuy(mucTieuId) {
  const m = appData.mucTieu.find(x => x.id === mucTieuId);
  if (!m) return;
  const tong = appData.nhatKy.filter(n => n.mucTieuId === mucTieuId).reduce((s, n) => s + n.soGio, 0);
  m.tichLuy = tong;
  const pt = m.chiTieu > 0 ? tong / m.chiTieu : 0;
  if (pt >= 1 && !m.ngayHoanThanh) m.ngayHoanThanh = new Date().toLocaleDateString('vi-VN');
  if (pt < 1 && m.ngayHoanThanh) m.ngayHoanThanh = null;
  luuDuLieu(appData);
}

// ===== Lịch sử tưới nước có thể sửa/xóa ngay trong modal chi tiết =====
function renderLichSuTuoiTrongModal(id) {
  const hop = document.getElementById('khu-lich-su-tuoi');
  const list = appData.nhatKy.filter(n => n.mucTieuId === id).sort((a, b) => b.ngay - a.ngay);
  if (list.length === 0) { hop.innerHTML = '<p class="phu-de-nho">Chưa có lần tưới nước nào.</p>'; return; }
  hop.innerHTML = list.map(n => `
    <div class="dong-nhat-ky" data-nk-id="${n.id}">
      <input type="date" class="nk-ngay" value="${new Date(n.ngay).toISOString().slice(0, 10)}">
      <input type="number" class="nk-gio" min="1" step="1" value="${n.soGio}">
      <button class="nut-nho nut-luu-dong" title="Lưu">💾</button>
      <button class="nut-nho nut-xoa-dong" title="Xóa">🗑</button>
    </div>
  `).join('');
  hop.querySelectorAll('.nut-luu-dong').forEach(btn => {
    btn.addEventListener('click', () => {
      const dong = btn.closest('.dong-nhat-ky');
      suaDongNhatKy(Number(dong.dataset.nkId), id, dong.querySelector('.nk-ngay').value, dong.querySelector('.nk-gio').value);
    });
  });
  hop.querySelectorAll('.nut-xoa-dong').forEach(btn => {
    btn.addEventListener('click', () => xoaDongNhatKy(Number(btn.closest('.dong-nhat-ky').dataset.nkId), id));
  });
}
function suaDongNhatKy(nhatKyId, mucTieuId, ngayMoi, gioMoiChuoi) {
  const gioMoi = parseFloat(gioMoiChuoi);
  if (!ngayMoi || !gioMoi || gioMoi <= 0) { alert('Nhập ngày và số giờ hợp lệ nhé!'); return; }
  const entry = appData.nhatKy.find(n => n.id === nhatKyId);
  entry.ngay = new Date(ngayMoi).getTime();
  entry.soGio = gioMoi;
  tinhLaiTichLuy(mucTieuId);
  renderLichSuTuoiTrongModal(mucTieuId);
  renderTatCa();
}
function xoaDongNhatKy(nhatKyId, mucTieuId) {
  if (!confirm('Xóa lần tưới nước này?')) return;
  appData.nhatKy = appData.nhatKy.filter(n => n.id !== nhatKyId);
  tinhLaiTichLuy(mucTieuId);
  renderLichSuTuoiTrongModal(mucTieuId);
  renderTatCa();
}

// ===== Lịch sử chỉnh sửa (chỉ xem, không sửa được) =====
function renderLichSuSuaTrongModal(id) {
  const m = appData.mucTieu.find(x => x.id === id);
  const hop = document.getElementById('khu-lich-su-sua');
  const list = m.lichSuChinhSua || [];
  hop.innerHTML = list.length
    ? list.map(l => `<div class="chi-tiet-dong"><span class="chi-tiet-nhan">${new Date(l.ngay).toLocaleString('vi-VN')}</span><span class="chi-tiet-gt">${l.mota}</span></div>`).join('')
    : '<p class="phu-de-nho">Chưa có chỉnh sửa nào.</p>';
}

document.getElementById('btn-mo-form').addEventListener('click', moModalThem);
document.getElementById('btn-mo-form-2').addEventListener('click', moModalThem);
document.getElementById('btn-mo-form-noi').addEventListener('click', moModalThem);
document.getElementById('btn-dong-modal').addEventListener('click', () => lopPhuModal.classList.add('an'));
lopPhuModal.addEventListener('click', e => { if (e.target === lopPhuModal) lopPhuModal.classList.add('an'); });

document.querySelectorAll('.nut-uu-tien').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nut-uu-tien').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    uuTienDaChon = btn.dataset.gt;
  });
});

oNgayDuKien.addEventListener('change', () => {
  spanKhoangThoiGian.textContent = oNgayDuKien.value ? tinhKhoangCach(Date.now(), new Date(oNgayDuKien.value).getTime()) : '';
});

// ===== Toolbar ghi chú kiểu Gmail (đậm / nghiêng / gạch chân / checklist) =====
document.querySelectorAll('.thanh-cong-cu-ghichu button[data-lenh]').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    oGhiChuDien.focus();
    document.execCommand(btn.dataset.lenh, false, null);
  });
});
function chenDongChecklist(sauNode) {
  const dongMoi = document.createElement('div');
  dongMoi.className = 'dong-checklist';
  dongMoi.innerHTML = '<input type="checkbox"> <span>&nbsp;</span>';
  if (sauNode) sauNode.after(dongMoi);
  else oGhiChuDien.appendChild(dongMoi);
  const span = dongMoi.querySelector('span');
  const range = document.createRange();
  range.selectNodeContents(span);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  return dongMoi;
}

document.getElementById('btn-them-checklist').addEventListener('mousedown', e => {
  e.preventDefault();
  oGhiChuDien.focus();
  const sel = window.getSelection();
  let dongDangDung = null;
  if (sel.rangeCount) {
    const node = sel.getRangeAt(0).startContainer;
    const el = node.nodeType === 3 ? node.parentElement : node;
    dongDangDung = el.closest ? el.closest('.dong-checklist') : null;
  }
  chenDongChecklist(dongDangDung || oGhiChuDien.lastElementChild);
});

oGhiChuDien.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.getRangeAt(0).startContainer;
  const el = node.nodeType === 3 ? node.parentElement : node;
  const dongHienTai = el.closest ? el.closest('.dong-checklist') : null;
  if (!dongHienTai) return;

  e.preventDefault();
  const spanHienTai = dongHienTai.querySelector('span');
  const rong = !spanHienTai.textContent.replace(/\u00a0/g, '').trim();

  if (rong) {
    const dongThuong = document.createElement('div');
    dongThuong.innerHTML = '<br>';
    dongHienTai.replaceWith(dongThuong);
    const range = document.createRange();
    range.setStart(dongThuong, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    chenDongChecklist(dongHienTai);
  }
});

oGhiChuDien.addEventListener('click', e => {
  if (e.target.matches('input[type="checkbox"]')) {
    e.target.closest('.dong-checklist').classList.toggle('da-xong', e.target.checked);
  }
});

document.getElementById('btn-them-muc-tieu').addEventListener('click', () => {
  const ten = document.getElementById('ten-muc-tieu').value.trim();
  const loai = document.getElementById('loai-muc-tieu').value;
  const chiTieu = parseInt(document.getElementById('chi-tieu-gio').value, 10);
  const ngayDuKien = oNgayDuKien.value ? new Date(oNgayDuKien.value).getTime() : null;
  const ghiChu = oGhiChuDien.innerHTML;

  if (!ten || !Number.isInteger(chiTieu) || chiTieu <= 0) {
    alert('Nhập đủ Tên mục tiêu và Mục tiêu thời gian tích lũy (là số nguyên lớn hơn 0) nhé!');
    return;
  }

  if (dangSuaId) {
    const m = appData.mucTieu.find(x => x.id === dangSuaId);
    m.ten = ten; m.loai = loai; m.uuTien = uuTienDaChon; m.chiTieu = chiTieu;
    m.ngayDuKien = ngayDuKien; m.ghiChu = ghiChu;
    const pt = m.tichLuy / m.chiTieu;
    if (pt >= 1 && !m.ngayHoanThanh) m.ngayHoanThanh = new Date().toLocaleDateString('vi-VN');
    if (pt < 1 && m.ngayHoanThanh) m.ngayHoanThanh = null;
    if (!m.lichSuChinhSua) m.lichSuChinhSua = [];
    m.lichSuChinhSua.unshift({ ngay: Date.now(), mota: 'Đã cập nhật thông tin mục tiêu' });
  } else {
    const bayGio = Date.now();
    appData.mucTieu.push({
      id: bayGio, ten, loai, uuTien: uuTienDaChon, chiTieu, ghiChu,
      tichLuy: 0, ngayTao: bayGio, ngayDuKien, ngayCapNhatCuoi: bayGio,
      ngayHoanThanh: null, lichSuChinhSua: []
    });
  }
  luuDuLieu(appData);
  lopPhuModal.classList.add('an');
  renderTatCa();
});

// ================= MODAL TƯỚI NƯỚC =================
const lopPhuTuoi = document.getElementById('lop-phu-tuoi');
let dangTuoiId = null;

function moModalTuoi(id) {
  dangTuoiId = id;
  const m = appData.mucTieu.find(x => x.id === id);
  document.getElementById('ten-muc-tieu-dang-tuoi').textContent = `Đang tưới cho: ${m.ten}`;
  document.getElementById('so-gio-tuoi').value = '';
  document.getElementById('ngay-tuoi').value = new Date().toISOString().slice(0, 10);
  lopPhuTuoi.classList.remove('an');
  setTimeout(() => document.getElementById('so-gio-tuoi').focus(), 100);
}
document.getElementById('btn-dong-modal-tuoi').addEventListener('click', () => lopPhuTuoi.classList.add('an'));
lopPhuTuoi.addEventListener('click', e => { if (e.target === lopPhuTuoi) lopPhuTuoi.classList.add('an'); });

document.getElementById('btn-xac-nhan-tuoi').addEventListener('click', () => {
  const nhap = document.getElementById('so-gio-tuoi').value.trim();
  const ngayChon = document.getElementById('ngay-tuoi').value;
  if (!nhap) { alert('Nhập số giờ nhé!'); return; }
  if (!ngayChon) { alert('Chọn ngày thực hiện nhé!'); return; }
  const soGio = parseSoGio(nhap);
  if (soGio <= 0) { alert('Số giờ không hợp lệ.'); return; }

  const mt = appData.mucTieu.find(m => m.id === dangTuoiId);
  const ptTruoc = mt.tichLuy / mt.chiTieu;

  appData.nhatKy.unshift({ id: Date.now(), mucTieuId: mt.id, tenMucTieu: mt.ten, soGio, ngay: new Date(ngayChon).getTime() });
  mt.ngayCapNhatCuoi = Date.now();
  tinhLaiTichLuy(mt.id);

  const ptSau = mt.tichLuy / mt.chiTieu;
  const vuaHoanThanh = ptSau >= 1 && ptTruoc < 1;

  const idVuaTuoi = mt.id;
  lopPhuTuoi.classList.add('an');
  renderTatCa();

  requestAnimationFrame(() => {
    const els = document.querySelectorAll(`[data-id="${idVuaTuoi}"]`);
    hieuUngTuoi(els);
    if (vuaHoanThanh) setTimeout(() => hieuUngHoanThanh(document.querySelectorAll(`[data-id="${idVuaTuoi}"]`)), 500);
  });
});

function hieuUngTuoi(elList) {
  elList.forEach(el => {
    el.classList.add('dang-tuoi-nuoc');
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'giot-nuoc-bay';
      s.textContent = '💧';
      s.style.left = (28 + i * 16 + Math.random() * 8) + 'px';
      s.style.animationDelay = (i * 0.08) + 's';
      el.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    }
    setTimeout(() => el.classList.remove('dang-tuoi-nuoc'), 650);
  });
}
function hieuUngHoanThanh(elList) {
  const emojis = ['🎉', '✨', '🌟', '🎊', '🎉'];
  elList.forEach(el => {
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'hat-confetti';
      s.textContent = emojis[i];
      s.style.left = (10 + i * 22) + 'px';
      s.style.animationDelay = (i * 0.06) + 's';
      el.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  });
}

// ================= XÓA MỤC TIÊU =================
function xoaMucTieu(id) {
  if (!confirm('Xóa mục tiêu này?')) return;
  appData.mucTieu = appData.mucTieu.filter(m => m.id !== id);
  appData.nhatKy = appData.nhatKy.filter(n => n.mucTieuId !== id);
  luuDuLieu(appData);
  renderTatCa();
}

// ================= THẺ DÂY LEO (dùng chung nhiều nơi) =================
function taoTheDayLeo(m) {
  const pt = m.tichLuy / m.chiTieu;
  const ptHienThi = Math.min(pt * 100, 100).toFixed(0);
  const conNgay = conBaoNhieuNgay(m.ngayDuKien);
  const daLau = !m.ngayHoanThanh && (Date.now() - m.ngayCapNhatCuoi) > SO_NGAY_CANH_BAO * MOT_NGAY_MS;
  const loaiInfo = ICON_LOAI[m.loai] || { icon: '🎯', lop: '' };

  const div = document.createElement('div');
  div.className = 'the-day-leo';
  div.dataset.id = m.id;
  div.innerHTML = `
    <div class="avatar-loai ${loaiInfo.lop}">${loaiInfo.icon}</div>
    <div class="day-leo-noi">
      <div class="day-leo-ten">${m.ten} ${daLau ? '<span title="Lâu rồi chưa tưới nước" style="color:#d4574f;">⚠️</span>' : ''}</div>
      <div class="day-leo-loai">${m.loai}</div>
      <div class="day-leo-thanh-wrap">
        <div class="day-leo-badge">${ptHienThi}%</div>
        <div class="day-leo-thanh-fill" style="width:${ptHienThi}%"></div>
      </div>
    </div>
    <div class="day-leo-phai">
      <b>${m.tichLuy}/${m.chiTieu} giờ</b>
      ${m.ngayHoanThanh ? `✅ ${m.ngayHoanThanh}` : (conNgay !== null ? (conNgay >= 0 ? 'Còn ' + conNgay + ' ngày' : 'Quá hạn') : '—')}
    </div>
    <div class="nhom-thao-tac">
      <button class="nut-thao-tac nut-tuoi" title="Tưới nước">💧</button>
      <button class="nut-thao-tac nut-xem" title="Xem chi tiết / chỉnh sửa">👁</button>
      <button class="nut-thao-tac nut-xoa" title="Xóa">🗑</button>