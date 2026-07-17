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
  // Chèn ngay tại dòng checklist đang đứng (nếu có), hoặc cuối cùng nếu không
  const sel = window.getSelection();
  let dongDangDung = null;
  if (sel.rangeCount) {
    const node = sel.getRangeAt(0).startContainer;
    const el = node.nodeType === 3 ? node.parentElement : node;
    dongDangDung = el.closest ? el.closest('.dong-checklist') : null;
  }
  chenDongChecklist(dongDangDung || oGhiChuDien.lastElementChild);
});

// Bấm Enter khi đang ở trong 1 dòng checklist -> tự xuống dòng checklist mới (giống Gmail/Keep)
oGhiChuDien.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.getRangeAt(0).startContainer;
  const el = node.nodeType === 3 ? node.parentElement : node;
  const dongHienTai = el.closest ? el.closest('.dong-checklist') : null;
  if (!dongHienTai) return; // không phải checklist, để trình duyệt xử lý bình thường

  e.preventDefault();
  const spanHienTai = dongHienTai.querySelector('span');
  const rong = !spanHienTai.textContent.replace(/\u00a0/g, '').trim();

  if (rong) {
    // Enter ở dòng checklist rỗng -> thoát khỏi checklist, tạo dòng thường
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
    </div>
  `;
  div.querySelector('.nut-tuoi').addEventListener('click', () => moModalTuoi(m.id));
  div.querySelector('.nut-xem').addEventListener('click', () => suaMucTieu(m.id));
  div.querySelector('.nut-xoa').addEventListener('click', () => xoaMucTieu(m.id));
  return div;
}

// ================= TRANG TỔNG QUAN =================
function renderTongQuan() {
  const ds = appData.mucTieu;
  const mam = ds.filter(m => giaiDoan(m.tichLuy / m.chiTieu) === 'mam').length;
  const truongThanh = ds.filter(m => m.ngayHoanThanh).length;

  datSoDem(document.getElementById('tk-mam'), mam);
  datSoDem(document.getElementById('tk-truong-thanh'), truongThanh);

  const homNay = new Date(); homNay.setHours(0, 0, 0, 0);
  let soNgayCoTuoi = 0;
  for (let i = 0; i < 7; i++) {
    const ngayXet = homNay.getTime() - i * MOT_NGAY_MS;
    const coTuoi = appData.nhatKy.some(n => {
      const d = new Date(n.ngay); d.setHours(0, 0, 0, 0);
      return d.getTime() === ngayXet;
    });
    if (coTuoi) soNgayCoTuoi++;
  }
  datSoDem(document.getElementById('tk-tuan'), Math.round(soNgayCoTuoi / 7 * 100), '%');

  renderRung(document.getElementById('canh-rung'), document.getElementById('rung-chu-thich'), ds);

  const dangLon = ds.filter(m => !m.ngayHoanThanh)
    .sort((a, b) => b.ngayCapNhatCuoi - a.ngayCapNhatCuoi).slice(0, 3);
  const hopDangLon = document.getElementById('ds-dang-lon');
  hopDangLon.innerHTML = '';
  if (dangLon.length === 0) hopDangLon.innerHTML = '<p class="phu-de-nho">Chưa có mục tiêu nào đang thực hiện. Gieo hạt đầu tiên nhé! 🌱</p>';
  dangLon.forEach(m => hopDangLon.appendChild(taoTheDayLeo(m)));

  datSoDem(document.getElementById('tong-gio-tuoi'), ds.reduce((s, m) => s + m.tichLuy, 0));
}

function renderRung(canhEl, chuThichEl, dsMucTieu) {
  canhEl.innerHTML = '';
  if (dsMucTieu.length === 0) {
    canhEl.innerHTML = '<p style="align-self:center;color:#5a6b5a;font-size:13px;">🐼 Khu rừng còn trống, hãy gieo hạt đầu tiên!</p>';
  }
  dsMucTieu.forEach(m => {
    const pt = m.tichLuy / m.chiTieu;
    const div = document.createElement('div');
    div.className = 'cay-mini';
    div.innerHTML = `${iconGiaiDoan(giaiDoan(pt))}<span>${m.ten.length > 12 ? m.ten.slice(0, 12) + '…' : m.ten}</span>`;
    canhEl.appendChild(div);
  });
  const soMam = dsMucTieu.filter(m => giaiDoan(m.tichLuy / m.chiTieu) === 'mam').length;
  const soDangLon = dsMucTieu.filter(m => giaiDoan(m.tichLuy / m.chiTieu) === 'dang-lon').length;
  const soTruongThanh = dsMucTieu.filter(m => giaiDoan(m.tichLuy / m.chiTieu) === 'truong-thanh').length;
  chuThichEl.innerHTML = `
    <span class="the-chu-thich">🌱 ${soMam} Mầm cây</span>
    <span class="the-chu-thich">🌿 ${soDangLon} Đang lớn</span>
    <span class="the-chu-thich">🌳 ${soTruongThanh} Trưởng thành</span>
  `;
}

// ================= TRANG MỤC TIÊU (tất cả + lọc) =================
let bocLocHienTai = 'tat-ca';
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    bocLocHienTai = chip.dataset.loc;
    renderDsTatCa();
  });
});
function renderDsTatCa() {
  let ds = appData.mucTieu;
  if (bocLocHienTai === 'dang-lam') ds = ds.filter(m => !m.ngayHoanThanh);
  if (bocLocHienTai === 'hoan-thanh') ds = ds.filter(m => m.ngayHoanThanh);
  const hop = document.getElementById('ds-tat-ca');
  hop.innerHTML = '';
  if (ds.length === 0) hop.innerHTML = '<p class="phu-de-nho">Không có mục tiêu nào ở mục này.</p>';
  ds.forEach(m => hop.appendChild(taoTheDayLeo(m)));
}

// ================= TRANG LỊCH SỬ =================
function renderLichSu() {
  const ds = appData.mucTieu.filter(m => m.ngayHoanThanh);
  const hop = document.getElementById('ds-lich-su');
  hop.innerHTML = '';
  if (ds.length === 0) { hop.innerHTML = '<p class="phu-de-nho">Chưa có mục tiêu nào hoàn thành. Cố lên nhé! 💪</p>'; return; }
  ds.forEach(m => hop.appendChild(taoTheDayLeo(m)));
}

// ================= THỐNG KÊ (nằm trong trang Tổng quan) =================
function renderThongKe() {
  const ds = appData.mucTieu;
  const tong = ds.length;
  const hoanThanh = ds.filter(m => m.ngayHoanThanh).length;
  const trungBinh = tong === 0 ? 0 : ds.reduce((s, m) => s + Math.min(m.tichLuy / m.chiTieu, 1), 0) / tong * 100;
  document.getElementById('tk-trung-binh').textContent = trungBinh.toFixed(0) + '%';

  const chuVi = 2 * Math.PI * 50;
  document.getElementById('vong-trung-binh-fill').style.strokeDashoffset = chuVi - (trungBinh / 100) * chuVi;

  const gocHT = tong === 0 ? 0 : (hoanThanh / tong) * 360;
  document.getElementById('banh-donut').style.background = `conic-gradient(#4c9c56 0deg ${gocHT}deg, #cdd9cd ${gocHT}deg 360deg)`;

  const bieuDo = document.getElementById('bieu-do-tien-trinh');
  bieuDo.innerHTML = '';
  if (tong === 0) { bieuDo.innerHTML = '<p class="phu-de-nho">Chưa có dữ liệu.</p>'; return; }
  ds.forEach(m => {
    const pt = Math.min(m.tichLuy / m.chiTieu, 1) * 100;
    const hang = document.createElement('div');
    hang.className = 'hang-bieu-do';
    hang.innerHTML = `<div class="dong-nhan"><span>${iconGiaiDoan(giaiDoan(m.tichLuy / m.chiTieu))} ${m.ten}</span><span>${pt.toFixed(0)}%</span></div>
      <div class="thanh-nen"><div class="thanh-fill" style="width:${pt}%"></div></div>`;
    bieuDo.appendChild(hang);
  });
}

// ================= TRANG NHẬT KÝ =================
function renderNhatKy() {
  const hop = document.getElementById('ds-nhat-ky');
  hop.innerHTML = '';
  if (appData.nhatKy.length === 0) { hop.innerHTML = '<p class="phu-de-nho">Chưa có lần tưới nước nào được ghi nhận.</p>'; return; }
  appData.nhatKy.forEach(n => {
    const div = document.createElement('div');
    div.className = 'the-day-leo';
    div.innerHTML = `
      <div class="avatar-loai" style="background:#e6f6fb;">💧</div>
      <div class="day-leo-noi">
        <div class="day-leo-ten">${n.tenMucTieu}</div>
        <div class="day-leo-loai">${new Date(n.ngay).toLocaleString('vi-VN')}</div>
      </div>
      <div class="day-leo-phai"><b>+${n.soGio} giờ</b></div>
    `;
    hop.appendChild(div);
  });
}

// ================= TRANG CÀI ĐẶT =================
document.getElementById('btn-luu-ten').addEventListener('click', () => {
  appData.ten = document.getElementById('ten-nguoi-dung').value.trim();
  luuDuLieu(appData);
  capNhatLoiChao();
  alert('Đã lưu tên!');
});
document.getElementById('btn-xoa-het').addEventListener('click', () => {
  if (!confirm('Chắc chắn xóa TOÀN BỘ dữ liệu? Không thể hoàn tác!')) return;
  appData = { ten: '', mucTieu: [], nhatKy: [] };
  luuDuLieu(appData);
  renderTatCa();
  alert('Đã xóa toàn bộ dữ liệu.');
});

// ================= LỊCH TƯỚI NƯỚC (cột phải) =================
function renderLichTuoi() {
  const thu = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  document.getElementById('hang-thu-lich').innerHTML = thu.map(t => `<span>${t}</span>`).join('');

  const homNay = new Date();
  const thuHomNay = (homNay.getDay() + 6) % 7;
  const ngayHangDau = new Date(homNay); ngayHangDau.setDate(homNay.getDate() - thuHomNay);

  let htmlNgay = '';
  let daTuoiHomNay = false;
  for (let i = 0; i < 7; i++) {
    const d = new Date(ngayHangDau); d.setDate(ngayHangDau.getDate() + i);
    const laHomNay = d.toDateString() === homNay.toDateString();
    if (laHomNay) {
      daTuoiHomNay = appData.nhatKy.some(n => new Date(n.ngay).toDateString() === d.toDateString());
    }
    htmlNgay += `<div class="ngay-o ${laHomNay ? 'hom-nay' : ''}">${d.getDate()}</div>`;
  }
  document.getElementById('hang-ngay-lich').innerHTML = htmlNgay;

  document.getElementById('the-trang-thai-tuoi').innerHTML = daTuoiHomNay
    ? '🌱 <div><b>Bạn đã tưới nước hôm nay rồi!</b><br>Giữ vững thói quen tuyệt vời này nhé.</div>'
    : '💧 <div><b>Hôm nay bạn chưa tưới nước.</b><br>Ghé qua 1 mục tiêu và cập nhật tiến độ nhé!</div>';
}

// ================= LOGO TÙY CHỈNH =================
const logoIconNut = document.getElementById('logo-icon-nut');
const inputLogo = document.getElementById('input-logo');
logoIconNut.addEventListener('click', () => inputLogo.click());
inputLogo.addEventListener('change', () => {
  const file = inputLogo.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Ảnh hơi nặng, chọn ảnh dưới 2MB nhé để tránh đầy bộ nhớ trình duyệt.');
    return;
  }
  const doc = new FileReader();
  doc.onload = () => {
    appData.logoAnh = doc.result;
    luuDuLieu(appData);
    hienThiLogo();
  };
  doc.readAsDataURL(file);
});
function hienThiLogo() {
  logoIconNut.innerHTML = appData.logoAnh ? `<img src="${appData.logoAnh}" alt="logo">` : '🐼';
}
hienThiLogo();

// ================= KHỞI ĐỘNG =================
function renderTatCa() {
  capNhatLoiChao();
  hienThiLogo();
  renderTongQuan();
  renderDsTatCa();
  renderLichSu();
  renderThongKe();
  renderNhatKy();
  renderLichTuoi();
}
// Không tự gọi renderTatCa() ở đây — sẽ tự chạy khi Firestore trả dữ liệu về sau khi đăng nhập (xem batDauDongBo).
