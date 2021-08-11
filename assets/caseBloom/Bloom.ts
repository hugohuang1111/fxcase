
import { _decorator, Component, Node, Director, ForwardFlow, ForwardStage, pipeline, ForwardPipeline } from 'cc';
import { BloomStage } from './BloomStage';
const { ccclass, property } = _decorator;

@ccclass('Bloom')
export class Bloom extends Component {

    start () {
        this.addCustomRendererStage();
    }

    addCustomRendererStage() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        if (!(pl instanceof ForwardPipeline)) {
            return;
        }
        const fpl = pl as ForwardPipeline;
        let flows = pl.flows;
        if (null == flows) {
            console.log("ERROR! can't find pileline flows");
            return;
        }
        for (let flow of flows) {
            if (flow instanceof ForwardFlow) {
                const ff = flow as ForwardFlow;
                const bs = new BloomStage();
                bs.initialize(ForwardStage.initInfo);
                bs.device = fpl.device;
                bs.descriptorSet = fpl.descriptorSet;
                bs.activate(fpl, ff);

                ff.stages.push(bs);
                break;
            }
        }
    }

}

