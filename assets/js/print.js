/* UBMS – print page helpers (QR rendering + print button). No inline scripts (CSP). */
(function () {
    'use strict';
    document.querySelectorAll('[data-qr]').forEach(function (el) {
        var text = el.getAttribute('data-qr');
        if (!text || typeof qrcode === 'undefined') { return; }
        var qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1, scalable: true });
    });
    document.querySelectorAll('[data-action="print"]').forEach(function (b) {
        b.addEventListener('click', function () { window.print(); });
    });
})();
