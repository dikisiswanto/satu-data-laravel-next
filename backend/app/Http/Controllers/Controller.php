<?php

namespace App\Http\Controllers;

use Illuminate\Routing\Controller as BaseController;

/**
 * Shared Laravel controller base. API controllers extend this class so framework
 * controller middleware and response helpers resolve through the normal PSR-4
 * App namespace instead of relying on an omitted legacy file.
 */
abstract class Controller extends BaseController {}
