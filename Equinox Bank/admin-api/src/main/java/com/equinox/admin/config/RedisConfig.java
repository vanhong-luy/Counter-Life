package com.equinox.admin.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheManager.RedisCacheManagerBuilder;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .activateDefaultTyping(
                BasicPolymorphicTypeValidator.builder()
                    .allowIfBaseType(Object.class)
                    .build(),
                ObjectMapper.DefaultTyping.EVERYTHING
            );

        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1))
            .disableCachingNullValues()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer(mapper)
                )
            );
    }

    @Bean
    public org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer cacheManagerBuilderCustomizer(
            RedisCacheConfiguration cacheConfiguration) {
        return builder -> {
            Map<String, RedisCacheConfiguration> configs = new HashMap<>();
            // Inherit the Jackson serializer from the base config, override TTL only
            // system_analytics does heavy multi-million-row aggregations (~9s cold),
            // so cache for 60 min instead of 10 to avoid frequent slow cold hits
            // that can stall other requests on the single-CPU container.
            configs.put("cache:system_analytics",
                    cacheConfiguration.entryTtl(Duration.ofMinutes(60)));
            configs.put("cache:telemetry",
                    cacheConfiguration.entryTtl(Duration.ofMinutes(60)));
            builder.withInitialCacheConfigurations(configs);
        };
    }
}
