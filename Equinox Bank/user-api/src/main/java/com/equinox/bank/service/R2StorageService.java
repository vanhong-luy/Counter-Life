package com.equinox.bank.service;

import java.io.IOException;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class R2StorageService {

    private final S3Client s3Client;
    private final String bucketName;

    public R2StorageService(S3Client s3Client, @Qualifier("r2BucketName") String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    public String uploadFile(MultipartFile file, int userId) {
        String fileKey = "documents/" + userId + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file bytes", e);
        }

        return fileKey;
    }

    public String uploadFile(byte[] fileBytes, int userId, String filename, String contentType) {
        String fileKey = "documents/" + userId + "/" + UUID.randomUUID() + "-" + filename;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .contentType(contentType)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(fileBytes));

        return fileKey;
    }

    public ResponseInputStream<GetObjectResponse> getFile(String fileKey) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .build();
        return s3Client.getObject(request);
    }

    public void deleteFile(String fileKey) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .build();

        s3Client.deleteObject(request);
    }
}
