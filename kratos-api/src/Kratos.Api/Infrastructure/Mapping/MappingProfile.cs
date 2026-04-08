using AutoMapper;
using Kratos.Api.Domain.Entities;
using Kratos.Api.Domain.DTOs;

namespace Kratos.Api.Infrastructure.Mapping;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserResponse>()
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => 
                src.CreatedAt > 0 
                ? DateTimeOffset.FromUnixTimeSeconds(src.CreatedAt).ToString("dd/MM/yyyy HH:mm:ss") 
                : "N/A"));

        CreateMap<UserCreateRequest, User>()
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.Name))
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
            .ForMember(dest => dest.CPF, opt => opt.MapFrom(src => src.CPF));
    }
}