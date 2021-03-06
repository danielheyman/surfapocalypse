<?php

namespace App\Equips;

class EquipManager {
    private $sets = [
        'human' => ['body/light', 'feet/brown_shoes', 'hair/plain_blonde', 'head/leather_cap', 'legs/teal_pants', 'torso/brown_longsleeve'],
        'zombie' => []
    ];
    
    private $priority = ['body', 'feet', 'legs', 'hair', 'head', 'torso'];

    private $types = [
        'body' => [
            'light' => []
        ],
        'feet' => [
            'brown_shoes' => [
                'speed' => 30
            ]
        ],
        'hair' => [
            'plain_blonde' => []
        ],
        'head' => [
            'leather_cap' => [
                'defense' => 10
            ]
        ],
        'legs' => [
            'teal_pants' => [
                'defense' => 10
            ]
        ],
        'torso' => [
            'brown_longsleeve' => [
                'defense' => 10
            ]
        ]
    ];
    
    private $user;
    
    public function __construct($user) {
        $this->user = $user;
    }
    
    public function giveSet() {
        $set = $this->sets[$this->user->human ? 'human' : 'zombie'];
        foreach($set as $type) {
            $this->user->equips()->create([
                'equip_type' => $type
            ]);
        }
    }
    
    function priority($item) {
        return array_search(explode("/", $item)[0], $this->priority);
    }
    
    function myEquipsToString() {
        $list = [];
        foreach($this->user->equips as $e) {
            $list[] = $e->equip_type;
        }
        uasort($list, function($a, $b) {
            return EquipManager::priority($b) <=> EquipManager::priority($a);
        });
        return implode(',', $list);
    }
}
