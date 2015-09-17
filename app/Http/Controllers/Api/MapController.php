<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\User;
use App\ItemType;
use Session;

class MapController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function getMap()
    {
        $items = ItemType::all();

        $map_items = [];
        $ids = [
            'id' => null,
            'items' => []
        ];

        foreach($items as $item)
        {
            if(rand(1,10000)/100 <= $item->find_chance)
            {
                $id = str_random(60);
                $count = rand($item->find_min, $item->find_max);
                $ids['items'][$id] = ['id_real' => $item->id, 'count' => $count];
                $map_items[] = [
                    'id' => $id,
                    'icon' => $item->icon,
                    'count' => $count
                ];
            }
        }

        $user = User::where(function($query)
        {
            $query->where('human', true)
            ->orWhere('coins', '>', 0);
        })->where('website_count', '>', 0)->orderByRaw("RANDOM()")->first();

        $site = $user->websites()->where('enabled', true)->orderByRaw("RANDOM()")->first(['id', 'url']);

        $ids['id'] = md5($site->id);

        $map = $site->toArray();
        $map['items'] = $map_items;
        $map['id'] = $ids['id'];

        Session::put('current_map', $ids);

        return $map;
    }
}
