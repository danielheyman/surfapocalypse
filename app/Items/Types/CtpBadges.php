<?php
namespace App\Items\Types;

abstract class CtpBadges extends \App\Items\Item {    
    public $users = ['human', 'zombie'];
    public $max = 1;
} 

class CtpBadge50 extends CtpBadges {
    public $name = 'CtpBadge50';
    protected $attr = ['link' => ''];
    
    protected $findable = [
        'every' => 50,
    ];
    
    public function onCreate($attr) {
        $attr->link = ''; // generate badge link
    }
}
