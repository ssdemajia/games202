class Material {
    #flatten_uniforms;
    #flatten_attribs;
    #vsSrc;
    #fsSrc;
    // Uniforms is a map, attribs is a Array
    constructor(uniforms, attribs, shaderName) {
        this.uniforms = uniforms;
        this.attribs = attribs;
        this.#vsSrc = '';
        this.#fsSrc = '';
        this.shaderName = shaderName;
        
        this.#flatten_uniforms = ['uModelViewMatrix', 'uProjectionMatrix', 'uCameraPos', 'uLightPos', 'uLightIntensity'];
        for (let k in uniforms) {
            this.#flatten_uniforms.push(k);
        }
        this.#flatten_attribs = attribs;
    }

    setMeshAttribs(extraAttribs) {
        for (let i = 0; i < extraAttribs.length; i++) {
            this.#flatten_attribs.push(extraAttribs[i]);
        }
    }

    compile(gl) {
        return fetch(`src/shaders/${this.shaderName}/vertex.glsl`)
        .then(async resp => {
            console.log(`load shader ${this.shaderName}/vertex.glsl success`);
            this.#vsSrc = await resp.text();
            return fetch(`src/shaders/${this.shaderName}/fragment.glsl`);
        })
        .then(async resp => {
            this.#fsSrc = await resp.text();
            console.log(`load shader ${this.shaderName}/fragment.glsl success`);
            return new Shader(gl, this.#vsSrc, this.#fsSrc,
                {
                    uniforms: this.#flatten_uniforms,
                    attribs: this.#flatten_attribs
                });
        })
    }
}