class PRTMaterial extends Material {

    constructor(vertexShader, fragmentShader) {

        super({
            'uPrecomputeL0': { type: 'precomputeL', value: null},
            'uPrecomputeL1': { type: 'precomputeL', value: null},
            'uPrecomputeL2': { type: 'precomputeL', value: null},
        }, 
        ['aPrecomputeLT'], 
        vertexShader, fragmentShader, null);
    }
}

async function buildPRTMaterial(vertexPath, fragmentPath) {


    let vertexShader = await getShaderString(vertexPath);
    let fragmentShader = await getShaderString(fragmentPath);

    return new PRTMaterial(vertexShader, fragmentShader);

}