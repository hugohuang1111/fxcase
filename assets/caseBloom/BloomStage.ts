
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BloomStage')
export class BloomStage extends ForwardStage {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    constructor() {
        super();
        this._phaseID = getPhaseID('default');
    }

    public render (camera: renderer.scene.Camera): void {
    }

}

