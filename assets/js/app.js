/* UBMS – shared front-end behaviour. Everything is driven by data-* attributes (no inline JS; strict CSP). */
(function ($) {
    'use strict';

    var csrf = $('meta[name="csrf-token"]').attr('content');
    var baseUrl = ($('meta[name="base-url"]').attr('content') || '/').replace(/\/$/, '');
    $.ajaxSetup({ headers: { 'X-CSRF-TOKEN': csrf, 'X-Requested-With': 'XMLHttpRequest' } });

    function esc(s) { return $('<div>').text(s == null ? '' : String(s)).html(); }

    // ------------------------------------------------ confirmations
    $(document).on('submit', 'form[data-confirm]', function (e) {
        if (!window.confirm($(this).data('confirm'))) { e.preventDefault(); }
    });
    $(document).on('click', 'a[data-confirm], button[data-confirm]:not([type=submit])', function (e) {
        if (!window.confirm($(this).data('confirm'))) { e.preventDefault(); e.stopImmediatePropagation(); }
    });
    // Prevent double submits
    $(document).on('submit', 'form:not([data-no-lock])', function () {
        var $f = $(this);
        setTimeout(function () { $f.find('button[type=submit],button:not([type])').prop('disabled', true); }, 0);
        setTimeout(function () { $f.find('button').prop('disabled', false); }, 8000);
    });

    // ------------------------------------------------ DataTables
    if ($.fn.dataTable) {
        $.extend(true, $.fn.dataTable.defaults, {
            pageLength: 25,
            lengthMenu: [10, 25, 50, 100],
            responsive: true,
            language: { search: '', searchPlaceholder: 'Search…', emptyTable: 'No records found', processing: '<i class="fa-solid fa-spinner fa-spin"></i> Loading…' }
        });
    }

    function exportButtons() {
        return [
            { extend: 'copy', className: 'btn btn-sm btn-outline-secondary' },
            { extend: 'csv', className: 'btn btn-sm btn-outline-secondary' },
            { extend: 'excel', className: 'btn btn-sm btn-outline-secondary' },
            { extend: 'print', className: 'btn btn-sm btn-outline-secondary' }
        ];
    }

    // Server-side tables: <table data-source="/admin/x/data"> with <th data-data="col">
    $('table[data-source]').each(function () {
        var $t = $(this);
        var id = $t.attr('id');
        var cols = $t.find('thead th').map(function () {
            var $th = $(this);
            return { data: $th.data('data'), orderable: $th.data('orderable') !== false, className: $th.data('class') || '', responsivePriority: $th.data('priority') || 10000 };
        }).get();
        var opts = {
            serverSide: true,
            processing: true,
            searchDelay: 400,
            order: [[$t.data('order-col') || 0, $t.data('order-dir') || 'desc']],
            ajax: {
                url: $t.data('source'),
                type: 'POST',
                data: function (d) {
                    d._token = csrf;
                    $('[data-dt-filter="#' + id + '"]').each(function () { d[this.name] = $(this).val(); });
                }
            },
            columns: cols
        };
        if ($t.data('export')) {
            opts.layout = { topStart: { buttons: exportButtons() }, topEnd: 'search' };
        }
        var table = $t.DataTable(opts);
        $('[data-dt-filter="#' + id + '"]').on('change', function () { table.ajax.reload(); });
    });

    // Client-side tables
    $('table.datatable').each(function () {
        var $t = $(this);
        var opts = { order: $t.data('order-col') !== undefined ? [[$t.data('order-col'), $t.data('order-dir') || 'asc']] : [] };
        if ($t.data('export')) {
            opts.layout = { topStart: { buttons: exportButtons() }, topEnd: 'search' };
        }
        if ($t.data('paging') === false) { opts.paging = false; }
        $t.DataTable(opts);
    });

    // ------------------------------------------------ QR codes
    $('[data-qr]').each(function () {
        if (typeof qrcode === 'undefined') { return; }
        var qr = qrcode(0, 'M');
        qr.addData($(this).data('qr'));
        qr.make();
        this.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    });

    // ------------------------------------------------ repeatable rows
    $(document).on('click', '[data-repeater-add]', function () {
        var $wrap = $($(this).data('repeater-add'));
        var tpl = $wrap.find('template')[0];
        var idx = $wrap.data('next-index') || $wrap.find('[data-repeater-item]').length;
        var html = tpl.innerHTML.replace(/__INDEX__/g, idx);
        $wrap.data('next-index', idx + 1);
        $wrap.find('[data-repeater-list]').append(html);
    });
    $(document).on('click', '[data-repeater-remove]', function () {
        $(this).closest('[data-repeater-item]').remove();
    });

    // ------------------------------------------------ show/hide by checkbox or select
    function syncToggle(el) {
        var $el = $(el);
        var target = $el.data('toggle-target');
        var show = $el.is(':checkbox') ? $el.is(':checked') : String($el.val()) === String($el.data('toggle-value'));
        if ($el.data('toggle-invert')) { show = !show; }
        $(target).toggleClass('d-none', !show).find('input,select,textarea').prop('disabled', !show);
    }
    $('[data-toggle-target]').each(function () { syncToggle(this); }).on('change', function () { syncToggle(this); });

    // ------------------------------------------------ navigate on select change
    $(document).on('change', 'select[data-navigate]', function () {
        var base = $(this).data('navigate');
        if (this.value) { window.location.href = base + (base.indexOf('?') >= 0 ? '&' : '?') + this.name + '=' + encodeURIComponent(this.value); }
    });

    // ------------------------------------------------ resident search (autocomplete)
    function bindResidentSearch(root) {
    $(root).find('[data-resident-search]').addBack('[data-resident-search]').not('[data-rs-bound]').each(function () {
        var $input = $(this).attr('data-rs-bound', '1');
        var $hidden = $($input.data('target'));
        var $box = $('<div class="list-group shadow resident-search-results d-none"></div>');
        $input.parent().addClass('position-relative').append($box);
        var timer;
        $input.on('input', function () {
            clearTimeout(timer);
            $hidden.val('');
            var q = $input.val().trim();
            if (q.length < 2) { $box.addClass('d-none').empty(); return; }
            timer = setTimeout(function () {
                $.getJSON(baseUrl + '/admin/residents/search', { q: q }, function (rows) {
                    $box.empty();
                    if (!rows.length) { $box.append('<div class="list-group-item small text-body-secondary">No verified resident found</div>'); }
                    rows.forEach(function (r) {
                        $('<button type="button" class="list-group-item list-group-item-action small"></button>')
                            .html('<strong>' + esc(r.name) + '</strong><br><span class="text-body-secondary">' + esc(r.resident_no || '') + ' · ' + esc(r.birthdate || '') + ' · ' + esc(r.address || '') + '</span>')
                            .on('click', function () { $input.val(r.name); $hidden.val(r.id).trigger('change'); $box.addClass('d-none'); })
                            .appendTo($box);
                    });
                    $box.removeClass('d-none');
                });
            }, 300);
        });
        $(document).on('click', function (e) { if (!$(e.target).closest($input.parent()).length) { $box.addClass('d-none'); } });
    });
    }
    bindResidentSearch(document);
    $(document).on('click', '[data-repeater-add]', function () { bindResidentSearch($($(this).data('repeater-add'))); });

    // ------------------------------------------------ geolocation
    $(document).on('click', '[data-geo]', function () {
        var $btn = $(this);
        if (!navigator.geolocation) { alert('Location is not available on this device.'); return; }
        $btn.prop('disabled', true).find('i').addClass('fa-spin');
        navigator.geolocation.getCurrentPosition(function (pos) {
            $($btn.data('lat')).val(pos.coords.latitude.toFixed(7));
            $($btn.data('lng')).val(pos.coords.longitude.toFixed(7));
            $btn.prop('disabled', false).find('i').removeClass('fa-spin');
            $btn.removeClass('btn-outline-secondary').addClass('btn-success');
        }, function () {
            alert('Could not get your location. Please type the location instead.');
            $btn.prop('disabled', false).find('i').removeClass('fa-spin');
        }, { enableHighAccuracy: true, timeout: 10000 });
    });

    // ------------------------------------------------ signature pad
    $('canvas[data-signature]').each(function () {
        if (typeof SignaturePad === 'undefined') { return; }
        var canvas = this;
        var ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d').scale(ratio, ratio);
        var pad = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)' });
        var $out = $($(canvas).data('signature'));
        $(canvas).closest('form').on('submit', function () { if (!pad.isEmpty()) { $out.val(pad.toDataURL('image/png')); } });
        $('[data-signature-clear="#' + canvas.id + '"]').on('click', function () { pad.clear(); $out.val(''); });
    });

    // ------------------------------------------------ charts
    $('canvas[data-chart]').each(function () {
        if (typeof Chart === 'undefined') { return; }
        var cfg = $(this).data('chart');
        var brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#1a5d1a';
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() || '#f2b705';
        var palette = [brand, accent, '#0d6efd', '#dc3545', '#6f42c1', '#20c997', '#fd7e14', '#6c757d', '#198754', '#0dcaf0'];
        (cfg.data.datasets || []).forEach(function (ds, i) {
            if (!ds.backgroundColor) { ds.backgroundColor = cfg.type === 'line' ? brand : (cfg.type === 'bar' && cfg.data.datasets.length > 1 ? palette[i] : palette); }
            if (cfg.type === 'line') { ds.borderColor = palette[i]; ds.tension = 0.3; ds.fill = false; }
        });
        cfg.options = $.extend(true, { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: cfg.type !== 'bar' || cfg.data.datasets.length > 1 } } }, cfg.options || {});
        new Chart(this, cfg);
    });

    // ------------------------------------------------ misc
    $(document).on('click', '[data-action="print"]', function () { window.print(); });
    $('[data-bs-toggle="tooltip"]').each(function () { new bootstrap.Tooltip(this); });
    $(document).on('input', 'input[type=color][data-sync]', function () { $($(this).data('sync')).val(this.value); });
    $(document).on('input', 'input[data-sync-color]', function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) { $($(this).data('sync-color')).val(this.value); } });

    // ------------------------------------------------ reveal on scroll + counters
    var revealEls = document.querySelectorAll('[data-reveal]');
    function countUp(el) {
        var target = parseFloat(el.getAttribute('data-count')) || 0, start = null, dur = 1200;
        function tick(ts) {
            if (!start) { start = ts; }
            var p = Math.min((ts - start) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
            if (p < 1) { requestAnimationFrame(tick); }
        }
        requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) { return; }
                en.target.classList.add('revealed');
                en.target.querySelectorAll('[data-count]').forEach(countUp);
                io.unobserve(en.target);
            });
        }, { threshold: 0.12 });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('revealed'); });
    }

    // ------------------------------------------------ step-by-step form (wizard)
    $('form[data-wizard]').each(function () {
        var $form = $(this), $panes = $form.find('.wizard-pane'), $steps = $form.find('.wizard-steps li'), current = 0;
        function show(i) {
            current = Math.max(0, Math.min(i, $panes.length - 1));
            $panes.removeClass('active').eq(current).addClass('active');
            $steps.each(function (k) { $(this).toggleClass('active', k === current).toggleClass('done', k < current); });
            var last = current === $panes.length - 1;
            $form.find('[data-wizard-prev]').css('visibility', current === 0 ? 'hidden' : 'visible');
            $form.find('.wizard-next-btn').toggleClass('d-none', last);
            $form.find('.wizard-submit-btn').toggleClass('d-none', !last);
            if (last) { fillReview(); }
            var top = $form.offset().top - 90;
            if (window.scrollY > top) { window.scrollTo({ top: top, behavior: 'smooth' }); }
        }
        function valid(i) {
            var ok = true;
            $panes.eq(i).find('input,select,textarea').filter(':visible,:radio,:checkbox').each(function () {
                if (ok && !this.disabled && !this.checkValidity()) {
                    ok = false;
                    if ($(this).is(':visible')) { this.reportValidity(); return; }
                    // hidden inputs (e.g. big choice buttons) cannot show the browser bubble
                    var $group = $(this).closest('.col-12, .col-md-6, .row').first();
                    $group.find('.wizard-msg').remove();
                    $('<div class="text-danger small mt-1 wizard-msg"></div>').text('Please choose one of the options.').appendTo($group);
                    $group[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            return ok;
        }
        function fillReview() {
            $form.find('[data-review-for]').each(function () {
                var name = $(this).data('review-for'), $f = $form.find('[name="' + name + '"]');
                var v = $f.is('select') ? $f.find('option:selected').text() : ($f.is(':radio') ? $f.filter(':checked').next('label').find('[data-label]').text() || $f.filter(':checked').val() : $f.val());
                if ($f.is(':file')) { v = $f[0].files.length ? $f[0].files[0].name : ''; }
                $(this).text(v && String(v).trim() !== '' ? v : '—');
            });
        }
        $form.on('change', ':radio', function () { $form.find('.wizard-msg').remove(); });
        $form.on('click', '[data-wizard-next]', function () { if (valid(current)) { show(current + 1); } });
        $form.on('click', '[data-wizard-prev]', function () { show(current - 1); });
        $steps.each(function (k) { $(this).css('cursor', 'pointer').on('click', function () { if (k < current || valid(current)) { show(k); } }); });
        $form.on('submit', function (e) { for (var i = 0; i < $panes.length; i++) { if (!valid(i)) { show(i); valid(i); e.preventDefault(); return false; } } });
        var $bad = $form.find('.is-invalid').first();
        show($bad.length ? $panes.index($bad.closest('.wizard-pane')) : 0);
    });

    // ------------------------------------------------ show a block only when another field has a value
    //   <div data-show-when="is_head=1">…</div>
    function syncShowWhen() {
        $('[data-show-when]').each(function () {
            var parts = String($(this).data('show-when')).split('='), $f = $('[name="' + parts[0] + '"]');
            var v = $f.is(':radio') ? $f.filter(':checked').val() : ($f.is(':checkbox') ? ($f.is(':checked') ? $f.val() : '') : $f.val());
            var show = String(v) === parts[1];
            $(this).toggleClass('d-none', !show).find('input,select,textarea').prop('disabled', !show);
        });
    }
    $(document).on('change', 'input,select', syncShowWhen);
    syncShowWhen();

    // ------------------------------------------------ small helpers for non-technical users
    $(document).on('click', '[data-toggle-password]', function () {
        var $i = $($(this).data('toggle-password')), show = $i.attr('type') === 'password';
        $i.attr('type', show ? 'text' : 'password');
        $(this).find('i').toggleClass('fa-eye', !show).toggleClass('fa-eye-slash', show);
    });
    $(document).on('change', 'input[type=file][data-preview]', function () {
        var $img = $($(this).data('preview')), f = this.files && this.files[0];
        if (f && /^image\//.test(f.type)) { $img.attr('src', URL.createObjectURL(f)).show(); } else { $img.hide(); }
        $(this).closest('.upload-drop').find('[data-file-name]').text(f ? f.name : '');
    });
    $(document).on('change', '[data-check-all]', function () {
        $(this).closest($(this).data('check-all')).find('input[type=checkbox]').not(this).prop('checked', this.checked);
    });
    $('select[data-describe]').each(function () {
        var $s = $(this), $t = $($s.data('describe'));
        function upd() { $t.text($s.find('option:selected').data('desc') || ''); }
        $s.on('change', upd); upd();
    });
    $('[data-brand-preview]').each(function () {
        var $p = $(this);
        $('#primary_color, #primary_color_picker').on('input', function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) { $p.find('.bp-top, .bp-btn').css('background', this.value); } });
        $('#accent_color, #accent_color_picker').on('input', function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) { $p.find('.bp-accent').css('background', this.value); $p.find('.bp-top').css('border-bottom-color', this.value); } });
        $('input[name=name]').on('input', function () { $p.find('[data-bp-name]').text(this.value); });
        $('input[name=seal]').on('change', function () { if (this.files[0]) { $p.find('img').attr('src', URL.createObjectURL(this.files[0])); } });
    });

    // Activate a tab from the URL hash (#tab-name)
    if (location.hash) {
        var t = document.querySelector('[data-bs-toggle="tab"][data-bs-target="' + location.hash + '"]');
        if (t) { new bootstrap.Tab(t).show(); }
    }
})(jQuery);
