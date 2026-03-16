<?php
/**
 * Simple HTML Minifier
 */
function minify_html($html)
{
    if (!$html)
        return "";
    $search = [
        '/\>[^\S ]+/s',     // strip whitespaces after tags, except space
        '/[^\S ]+\</s',     // strip whitespaces before tags, except space
        '/(\t| )+/s',       // shorten multiple horizontal whitespace sequences
        '/<!--(.|\s)*?-->/' // Remove HTML comments
    ];

    $replace = [
        '>',
        '<',
        ' ',
        ''
    ];

    $buffer = preg_replace($search, $replace, $html);
    return trim($buffer);
}
