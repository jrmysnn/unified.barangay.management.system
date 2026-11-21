/* Static GitHub Pages preview – forms run in demo mode (nothing is sent anywhere). */
(function ($) {
    'use strict';
    var DEMO_CODE = 'CLR-2026-000123';

    $('<style>').text(
        '.demo-ribbon{background:#fff3cd;color:#664d03;border-bottom:1px solid #ffe69c}' +
        '.demo-note{border-left:4px solid #f2b705}'
    ).appendTo('head');

    function note(html) {
        return $('<div class="alert alert-warning demo-note mt-3 mb-0"></div>').html(html);
    }

    // Verify a document
    $('form[action="verify.html"]').each(function () {
        var $f = $(this);
        $f.find('input[name="control_no"]').attr('placeholder', 'Try ' + DEMO_CODE);
        $f.on('submit', function (e) {
            e.preventDefault();
            var v = String($f.find('input[name="control_no"]').val() || '').trim().toUpperCase();
            if (v === DEMO_CODE) {
                window.location.href = 'verify-result.html';
                return;
            }
            $f.parent().find('.demo-note').remove();
            note('<strong>No matching document found.</strong> This is a demo – try the sample control number <code>' + DEMO_CODE + '</code>.').insertAfter($f);
        });
    });

    // Sign in
    $('form[action="login.html"]').on('submit', function (e) {
        e.preventDefault();
        $(this).find('.demo-note').remove();
        note('This is a static preview, so signing in is not available. In the real system residents and barangay staff sign in here.').appendTo(this);
    });

    // Registration wizard – runs all the steps, then shows a demo confirmation instead of sending
    $('form[action="register.html"]').on('submit', function (e) {
        if (e.isDefaultPrevented()) { return; }          // the wizard found a missing field
        e.preventDefault();
        var name = $(this).find('[name="first_name"]').val();
        $(this).closest('.col-lg-9, .col-xl-8').html(
            '<div class="card shadow-sm text-center"><div class="card-body p-5">' +
            '<i class="fa-solid fa-circle-check fa-4x text-success mb-3"></i>' +
            '<h1 class="h3 fw-bold">Salamat, ' + $('<div>').text(name || 'resident').html() + '!</h1>' +
            '<p class="text-body-secondary">In the real system you would now receive a verification code by email, and the Barangay Secretary would verify your registration.</p>' +
            '<p class="small text-body-secondary mb-4">This is a static preview – nothing was sent or saved.</p>' +
            '<a class="btn btn-primary" href="index.html">Back to home</a></div></div>'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Sample verification result page
    if (/verify-result\.html$/.test(window.location.pathname)) {
        note('Demo result for the sample control number <code>' + DEMO_CODE + '</code>.').prependTo('.verify-result');
    }
})(jQuery);
