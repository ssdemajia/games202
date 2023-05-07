#include "denoiser.h"

Denoiser::Denoiser() : m_useTemportal(false) {}

void Denoiser::Reprojection(const FrameInfo &frameInfo) {
    int height = m_accColor.m_height;
    int width = m_accColor.m_width;
    Matrix4x4 preWorldToScreen =
        m_preFrameInfo.m_matrix[m_preFrameInfo.m_matrix.size() - 1];
    Matrix4x4 preWorldToCamera =
        m_preFrameInfo.m_matrix[m_preFrameInfo.m_matrix.size() - 2];
#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            // TODO: Reproject
            m_valid(x, y) = false;
            m_misc(x, y) = Float3(0.f);
            Float3 curWorldPosition = frameInfo.m_position(x, y);
            float curId = frameInfo.m_id(x, y);
            if (curId == -1)
                continue;
            Matrix4x4 curModel = frameInfo.m_matrix[curId];
            Float3 curModelPosition = Inverse(curModel)(curWorldPosition, Float3::EType::Point);
            Float3 preWorldPosition = m_preFrameInfo.m_matrix[curId](curModelPosition, Float3::EType::Point);
            Float3 preScreenPos = preWorldToScreen(preWorldPosition, Float3::EType::Point);
            int preScreenPosX = preScreenPos.x;
            int preScreenPosY = preScreenPos.y;
            if (preScreenPosX < 0 || preScreenPosX >= width || preScreenPosY < 0 ||
                preScreenPosY >= height)
                continue;
            float preId = m_preFrameInfo.m_id(preScreenPosX, preScreenPosY);
            if (preId != curId) {
                continue;
            } 
            m_valid(x, y) = true;
            m_misc(x, y) = m_accColor(preScreenPosX, preScreenPosY);  // 保存上一帧降噪后的值
        }
    }
    std::swap(m_misc, m_accColor);
}

void Denoiser::TemporalAccumulation(const Buffer2D<Float3> &curFilteredColor) {
    int height = m_accColor.m_height;
    int width = m_accColor.m_width;
    int kernelRadius = 3;
    int K = m_colorBoxK;
#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            // TODO: Temporal clamp
            Float3 color = m_accColor(x, y);
            // TODO: Exponential moving average
            float alpha = 1.0f;
            if (m_valid(x, y)) {
                alpha = m_alpha;
                Float3 avgColor;
                int count = 0;
                for (int i = -kernelRadius; i <= kernelRadius; i++) {
                    for (int j = -kernelRadius; j <= kernelRadius; j++) {
                        int newX = x + i;
                        int newY = y + j;
                        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                            avgColor += curFilteredColor(newX, newY);
                            count += 1;
                        }
                    }
                }
                avgColor /= count;

                Float3 variance;
                for (int i = -kernelRadius; i <= kernelRadius; i++) {
                    for (int j = -kernelRadius; j <= kernelRadius; j++) {
                        int newX = x + i;
                        int newY = y + j;
                        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                            Float3 delta = curFilteredColor(newX, newY) - avgColor;
                            variance += delta * delta;
                        }
                    }
                }
                // 计算当帧，降噪后的像素均值和方差
                variance /= count;
                Float3 Upper = avgColor + variance * K;
                Float3 Lower = avgColor - variance * K;
                color = Clamp(color, Lower, Upper);  // 将上一帧降噪后的值限定范围
            }
            m_misc(x, y) = Lerp(color, curFilteredColor(x, y), alpha);
        }
    }
    std::swap(m_misc, m_accColor);
}

Buffer2D<Float3> Denoiser::Filter(const FrameInfo &frameInfo) {
    int height = frameInfo.m_beauty.m_height;
    int width = frameInfo.m_beauty.m_width;
    Buffer2D<Float3> filteredImage = CreateBuffer2D<Float3>(width, height);
    int kernelRadius = 16;
#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            //filteredImage(x, y) = frameInfo.m_beauty(x, y);
            //continue;
            // TODO: Joint bilateral filter
            Float3 color;
            Float3 curPosition = frameInfo.m_position(x, y);
            Float3 curColor = frameInfo.m_beauty(x, y);
            Float3 curNormal = frameInfo.m_normal(x, y);
            float sumWeight = 0;
            for (int i = -kernelRadius; i <= kernelRadius; i++) 
            {
                for (int j = -kernelRadius; j <= kernelRadius; j++) 
                {
                    int newX = x + i;
                    int newY = y + j;
                    float p = 0.0f;
                    float c = 0.0f;
                    float n = 0.0f;
                    float l = 0.0f;
                    if (newX >= 0 && newY >= 0 && newX < width && newY < height) 
                    {
                        float temp = 0.0f;
                        // coord
                        p = (i * i + j * j) /(2 * pow(m_sigmaCoord, 2));

                        // color
                        Float3 newColor = frameInfo.m_beauty(newX, newY);
                        c = SqrDistance(newColor, curColor) / (2 * pow(m_sigmaColor, 2));

                        // normal
                        Float3 newNormal = frameInfo.m_normal(newX, newY);
                        temp = SafeAcos(Dot(newNormal, curNormal));
                        n = temp * temp / (2 * pow(m_sigmaNormal, 2));

                        // plane
                        Float3 newPosition = frameInfo.m_position(newX, newY);
                        Float3 newToCur = newPosition - curPosition;
                        if (Length(newToCur) == 0) {
                            l = 0.0f;
                        } else {
                            temp = Dot(curNormal, Normalize(newPosition - curPosition));
                            l = temp * temp / (2 * pow(m_sigmaPlane, 2));
                        }
                        float weight = exp(- p - c - n - l);
                        color += newColor * weight;
                        sumWeight += weight;                        
                    }
                }
            }
            filteredImage(x, y) = color / sumWeight;
        }
    }
    return filteredImage;
}

Buffer2D<Float3> Denoiser::FilterAtros(const FrameInfo &frameInfo) {
    int height = frameInfo.m_beauty.m_height;
    int width = frameInfo.m_beauty.m_width;
    Buffer2D<Float3> filteredImage = CreateBuffer2D<Float3>(width, height);
    int kernelRadius = 16;
    int innerKernel = 5;
#pragma omp parallel for
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            // TODO: Joint bilateral filter
            Float3 color;
            Float3 curPosition = frameInfo.m_position(x, y);
            Float3 curColor = frameInfo.m_beauty(x, y);
            Float3 curNormal = frameInfo.m_normal(x, y);
            float sumWeight = 0;
            for (int step = 1; step < 16; step *= 2) 
            {
                for (int i = -innerKernel; i <= innerKernel; i++) {
                    for (int j = -innerKernel; j <= innerKernel; j++) {
                        int newX = x + i * step;
                        int newY = y + j * step;
                        float p = 0.0f;
                        float c = 0.0f;
                        float n = 0.0f;
                        float l = 0.0f;
                        if (newX >= 0 && newY >= 0 && newX < width && newY < height) {
                            float temp = 0.0f;
                            // coord
                            p = (i * i + j * j) / (2 * pow(m_sigmaCoord, 2));

                            // color
                            Float3 newColor = frameInfo.m_beauty(newX, newY);
                            c = SqrDistance(newColor, curColor) /
                                (2 * pow(m_sigmaColor, 2));

                            // normal
                            Float3 newNormal = frameInfo.m_normal(newX, newY);
                            //std::cout << Dot(newNormal, curNormal) << std::endl;
                            temp = SafeAcos(Dot(newNormal, curNormal));
                            
                            n = temp * temp / (2 * pow(m_sigmaNormal, 2));

                            // plane
                            Float3 newPosition = frameInfo.m_position(newX, newY);
                            Float3 newToCur = newPosition - curPosition;
                            if (Length(newToCur) == 0) {
                                l = 0.0f;
                            } else {
                                temp =
                                    Dot(curNormal, Normalize(newPosition - curPosition));
                                l = temp * temp / (2 * pow(m_sigmaPlane, 2));
                            }
                            float weight = exp(-p - c - n - l);
                            color += newColor * weight;
                            sumWeight += weight;
                        }
                    }
                }
            }
            if (sumWeight <= 0.0)
                continue;
            filteredImage(x, y) = color / sumWeight;
        }
    }
    return filteredImage;
}
void Denoiser::Init(const FrameInfo &frameInfo, const Buffer2D<Float3> &filteredColor) {
    m_accColor.Copy(filteredColor);
    int height = m_accColor.m_height;
    int width = m_accColor.m_width;
    m_misc = CreateBuffer2D<Float3>(width, height);
    m_valid = CreateBuffer2D<bool>(width, height);
}

void Denoiser::Maintain(const FrameInfo &frameInfo) { m_preFrameInfo = frameInfo; }

Buffer2D<Float3> Denoiser::ProcessFrame(const FrameInfo &frameInfo) {
    // Filter current frame
    Buffer2D<Float3> filteredColor;
    //filteredColor = Filter(frameInfo);
    filteredColor = FilterAtros(frameInfo);
    // Reproject previous frame color to current
    if (m_useTemportal) {
        Reprojection(frameInfo);
        TemporalAccumulation(filteredColor);
    } else {
        Init(frameInfo, filteredColor);
    }

    // Maintain
    Maintain(frameInfo);
    if (!m_useTemportal) {
        m_useTemportal = true;
    }
    return m_accColor;
}
