
import { _decorator, Component, Node, Director, ForwardFlow, ForwardStage } from 'cc';
import { BloomStage } from './BloomStage';
const { ccclass, property } = _decorator;

@ccclass('Bloom')
export class Bloom extends Component {

    start () {
        this.addCustomRendererStage();
    }

    addCustomRendererStage() {
        let flows = Director.instance.root?.pipeline.flows;
        if (null == flows) {
            console.log("ERROR! can't find pileline flows");
            return;
        }
        for (let flow of flows) {
            if (flow instanceof ForwardFlow) {
                const ff = flow as ForwardFlow;
                const bs = new BloomStage();
                bs.initialize(ForwardStage.initInfo);
                ff.stages.push(bs);
                break;
            }
        }
    }

}

