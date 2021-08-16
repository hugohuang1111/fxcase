
import { _decorator } from 'cc';
import { BloomBaseStage } from './BloomBaseStage';
const { ccclass, property } = _decorator;
@ccclass('BloomMergeStage')
export class BloomMergeStage extends BloomBaseStage {
    constructor() {
        super();
        this._name = "BloomMergeStage";
    }
}

